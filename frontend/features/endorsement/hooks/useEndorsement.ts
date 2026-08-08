import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
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

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, isValidating, mutate } = useSWR(
    brand ? ['endorsement_boxes', brand] : null,
    () => endorsementService.fetchAllEndorsementData(brand, '', 'box'),
    { 
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  const incomingBoxes = data?.incoming || []
  const endorsementBoxes = data?.endorsement || []
  const lastUpdated = data ? new Date() : null

  const loadingIncoming = isLoading || !data
  const loadingEndorsement = isLoading || !data
  const isRefreshing = isValidating

  const [receivingBox, setReceivingBox] = useState<string | null>(null)

  const handleReceiveBox = async (box: BoxEntry) => {
    setReceivingBox(box.id)
    try {
      await endorsementService.receiveBox(box.id)
      toast.success(`${box.box_number} received`)
      mutate()
      setActiveTab('inspection')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceivingBox(null)
    }
  }

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      mutate()
    }

    es.addEventListener('BOX_UPDATED', handleUpdate)
    es.addEventListener('PIPELINE_UPDATED', handleUpdate)
    es.addEventListener('DASHBOARD_REFRESH', handleUpdate)
    es.addEventListener('ENDORSEMENT_LOCKED', handleUpdate)
    es.addEventListener('ENDORSEMENT_UNLOCKED', handleUpdate)
    es.addEventListener('ENDORSEMENT_DELAYED', handleUpdate)

    es.onerror = () => {
      console.warn('Endorsement SSE error - reconnecting')
    }

    return () => es.close()
  }, [mutate])

  // ── Outgoing Boxes ────────────────────────────────────────────────────────
  const [sendingToScan, setSendingToScan] = useState<string | null>(null)

  const outgoingBoxes = endorsementBoxes.filter((b) => b.box_sessions?.some((s) => s.status === 'completed'))
  const inspectionBoxes = endorsementBoxes
    .filter((b) => !b.box_sessions?.some((s) => s.status === 'completed'))
    .sort((a, b) => {
      const aStatus = a.box_sessions?.[0]?.status
      const bStatus = b.box_sessions?.[0]?.status
      const aIsActive = aStatus === 'in_progress' || aStatus === 'delayed'
      const bIsActive = bStatus === 'in_progress' || bStatus === 'delayed'
      if (aIsActive && !bIsActive) return -1
      if (!aIsActive && bIsActive) return 1
      return 0
    })

  const filteredIncoming = incomingBoxes.filter(b => matchesSearch(b, searchQuery))
  const filteredInspection = inspectionBoxes.filter(b => matchesSearch(b, searchQuery))
  const filteredOutgoing = outgoingBoxes.filter(b => matchesSearch(b, searchQuery))

  const handleSendToScan = async (box: BoxEntry) => {
    setSendingToScan(box.id)
    try {
      await endorsementService.sendToScan(box.id)
      mutate()
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

  const refreshAll = useCallback(async () => {
    await mutate()
  }, [mutate])

  const fetchEndorsementBoxes = refreshAll

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
    isRefreshing,
    receivingBox,
    sendingToScan,
    expandedBoxId,
    boxBooks,
    setBoxBooks,
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
