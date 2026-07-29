import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useBrand } from '@/hooks/use-brand'
import { getApiBaseUrl } from '@/lib/auth-api'
import { BoxEntry, BoxBookEntry } from '../types/endorsement.types'
import { endorsementService } from '../services/endorsement.service'

function matchesSearch(box: BoxEntry, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const boxMatch = (box.box_number || '').toLowerCase().includes(q)
  const lotMatch = (box.lot?.lot_number || '').toLowerCase().includes(q)
  return boxMatch || lotMatch
}

export function useEndorsement() {
  const { brand, colors } = useBrand()

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'incoming' | 'inspection' | 'outgoing'>('incoming')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')

  // ── Incoming Boxes ────────────────────────────────────────────────────────
  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [loadingIncoming, setLoadingIncoming] = useState(true)
  const [receivingBox, setReceivingBox] = useState<string | null>(null)

  const fetchIncoming = useCallback(async (silent = false) => {
    if (!silent) setLoadingIncoming(true)
    try {
      const filteredIncoming = await endorsementService.fetchIncomingBoxes(brand, '', 'box')
      setIncomingBoxes(filteredIncoming)
    } catch (e) {
      console.error('Failed to fetch incoming boxes:', e)
    } finally {
      setLoadingIncoming(false)
    }
  }, [brand])

  const handleReceiveBox = async (box: BoxEntry) => {
    setReceivingBox(box.id)
    try {
      await endorsementService.receiveBox(box.id)
      toast.success(`${box.box_number} received`)
      fetchIncoming()
      fetchEndorsementBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceivingBox(null)
    }
  }

  // ── Endorsement Boxes ─────────────────────────────────────────────────────
  const [endorsementBoxes, setEndorsementBoxes] = useState<BoxEntry[]>([])
  const [loadingEndorsement, setLoadingEndorsement] = useState(true)

  const fetchEndorsementBoxes = useCallback(async (silent = false) => {
    if (!silent) setLoadingEndorsement(true)
    try {
      const filteredEndorsement = await endorsementService.fetchEndorsementBoxes(brand, '', 'box')
      setEndorsementBoxes(filteredEndorsement)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch endorsement boxes:', e)
    } finally {
      setLoadingEndorsement(false)
    }
  }, [brand])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncoming()
      fetchEndorsementBoxes()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchIncoming, fetchEndorsementBoxes])

  const fetchIncomingRef = useRef(fetchIncoming)
  const fetchEndorsementBoxesRef = useRef(fetchEndorsementBoxes)
  
  useEffect(() => {
    fetchIncomingRef.current = fetchIncoming
    fetchEndorsementBoxesRef.current = fetchEndorsementBoxes
  }, [fetchIncoming, fetchEndorsementBoxes])

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      fetchIncomingRef.current(true)
      fetchEndorsementBoxesRef.current(true)
    }

    es.addEventListener('BOX_UPDATED', handleUpdate)
    es.addEventListener('PIPELINE_UPDATED', handleUpdate)
    es.addEventListener('DASHBOARD_REFRESH', handleUpdate)

    es.onerror = () => {
      console.warn('Endorsement SSE error - reconnecting')
    }

    return () => es.close()
  }, [])

  // ── Outgoing Boxes ────────────────────────────────────────────────────────
  const [sendingToScan, setSendingToScan] = useState<string | null>(null)

  const outgoingBoxes = endorsementBoxes.filter((b) => b.box_sessions?.some((s) => s.status === 'completed'))
  const inspectionBoxes = endorsementBoxes.filter((b) => !b.box_sessions?.some((s) => s.status === 'completed'))

  const filteredIncoming = incomingBoxes.filter(b => matchesSearch(b, searchQuery))
  const filteredInspection = inspectionBoxes.filter(b => matchesSearch(b, searchQuery))
  const filteredOutgoing = outgoingBoxes.filter(b => matchesSearch(b, searchQuery))

  const handleSendToScan = async (box: BoxEntry) => {
    setSendingToScan(box.id)
    try {
      await endorsementService.sendToScan(box.id)
      fetchEndorsementBoxes()
      toast.success(`${box.box_number} sent`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send to scan')
    } finally {
      setSendingToScan(null)
    }
  }

  // ── Expandable Rows State ─────────────────────────────────────────────────
  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BoxBookEntry[]>>({})
  const [loadingBoxBooks, setLoadingBoxBooks] = useState<string | null>(null)

  const [inspExpandedBoxId, setInspExpandedBoxId] = useState<string | null>(null)
  const [inspRowBooks, setInspRowBooks] = useState<Record<string, BoxBookEntry[]>>({})
  const [loadingInspRowBooks, setLoadingInspRowBooks] = useState<string | null>(null)

  const toggleBox = async (boxId: string) => {
    if (expandedBoxId === boxId) {
      setExpandedBoxId(null)
      return
    }
    setExpandedBoxId(boxId)
    if (!boxBooks[boxId]) {
      setLoadingBoxBooks(boxId)
      try {
        const books = await endorsementService.fetchBoxDetails(boxId)
        setBoxBooks((prev) => ({ ...prev, [boxId]: books }))
      } catch {
        setBoxBooks((prev) => ({ ...prev, [boxId]: [] }))
      } finally {
        setLoadingBoxBooks(null)
      }
    }
  }

  const toggleInspRow = async (boxId: string) => {
    if (inspExpandedBoxId === boxId) {
      setInspExpandedBoxId(null)
      return
    }
    setInspExpandedBoxId(boxId)
    if (!inspRowBooks[boxId]) {
      setLoadingInspRowBooks(boxId)
      try {
        const books = await endorsementService.fetchBoxDetails(boxId)
        setInspRowBooks((prev) => ({ ...prev, [boxId]: books }))
      } catch {
        setInspRowBooks((prev) => ({ ...prev, [boxId]: [] }))
      } finally {
        setLoadingInspRowBooks(null)
      }
    }
  }

  // ── Confirmation modal state ────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    action: 'receive' | 'start_session' | 'send_to_scan' | null
    box: BoxEntry | null
  }>({ open: false, action: null, box: null })

  const openConfirm = (action: 'receive' | 'start_session' | 'send_to_scan', box: BoxEntry) =>
    setConfirmModal({ open: true, action, box })
  const closeConfirm = () => setConfirmModal({ open: false, action: null, box: null })

  const refreshAll = () => {
    fetchIncoming()
    fetchEndorsementBoxes()
  }

  return {
    brand,
    colors,
    activeTab,
    setActiveTab,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    filteredIncoming,
    filteredInspection,
    filteredOutgoing,
    loadingIncoming,
    loadingEndorsement,
    receivingBox,
    sendingToScan,
    expandedBoxId,
    boxBooks,
    loadingBoxBooks,
    toggleBox,
    inspExpandedBoxId,
    inspRowBooks,
    loadingInspRowBooks,
    toggleInspRow,
    confirmModal,
    openConfirm,
    closeConfirm,
    handleReceiveBox,
    handleSendToScan,
    refreshAll,
    fetchEndorsementBoxes,
  }
}
