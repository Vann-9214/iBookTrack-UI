import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { fetchUserProfile, getApiBaseUrl } from '@/lib/auth-api'
import { BookInBox, BoxEntry, ConfirmModalState, CutTab } from '../types/cut.types'
import { cutService } from '../services/cut.service'
import { filterCutBoxBySearch } from '../utils/cut.helpers'

export function useCut(brand: string) {
  const [activeTab, setActiveTab] = useState<CutTab>('incoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [outgoingBoxes, setOutgoingBoxes] = useState<BoxEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [receivingBox, setReceivingBox] = useState<string | null>(null)
  const [sendingBox, setSendingBox] = useState<string | null>(null)

  const [userName, setUserName] = useState('')

  useEffect(() => {
    fetchUserProfile().then(profile => {
      if (profile?.name) setUserName(profile.name)
    })
  }, [])

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    action: null,
    box: null,
  })

  const openConfirm = (action: 'receive' | 'send', box: BoxEntry) =>
    setConfirmModal({ open: true, action, box })
  const closeConfirm = () => setConfirmModal({ open: false, action: null, box: null })

  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingBoxBooks, setLoadingBoxBooks] = useState<string | null>(null)

  const toggleBox = async (boxId: string) => {
    if (expandedBoxId === boxId) {
      setExpandedBoxId(null)
      return
    }
    setExpandedBoxId(boxId)
    if (!boxBooks[boxId]) {
      setLoadingBoxBooks(boxId)
      try {
        const books = await cutService.fetchBoxDetails(boxId)
        setBoxBooks(prev => ({ ...prev, [boxId]: books }))
      } catch (e) {
        setBoxBooks(prev => ({ ...prev, [boxId]: [] }))
      } finally {
        setLoadingBoxBooks(null)
      }
    }
  }

  const fetchBoxes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { incoming, outgoing } = await cutService.fetchBoxes(brand, '', 'box')
      setIncomingBoxes(incoming)
      setOutgoingBoxes(outgoing)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch boxes:', e)
    } finally {
      setLoading(false)
    }
  }, [brand])

  useEffect(() => {
    const timer = setTimeout(() => { fetchBoxes() }, 300)
    return () => clearTimeout(timer)
  }, [fetchBoxes])

  const fetchBoxesRef = useRef(fetchBoxes)
  useEffect(() => {
    fetchBoxesRef.current = fetchBoxes
  }, [fetchBoxes])

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      fetchBoxesRef.current(true)
    }

    es.addEventListener('BOX_UPDATED', handleUpdate)
    es.addEventListener('PIPELINE_UPDATED', handleUpdate)
    es.addEventListener('DASHBOARD_REFRESH', handleUpdate)

    es.onerror = () => {
      console.warn('Cut SSE error - reconnecting')
    }

    return () => es.close()
  }, [])

  const handleReceiveBox = async (box: BoxEntry) => {
    setReceivingBox(box.id)
    try {
      await cutService.receiveBox(box.id)
      toast.success(`${box.box_number} received`)
      fetchBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceivingBox(null)
    }
  }

  const handleSendBox = async (box: BoxEntry) => {
    setSendingBox(box.id)
    try {
      await cutService.sendBoxForward(box.id)
      toast.success(`${box.box_number} sent to Endorsement`)
      fetchBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send box')
    } finally {
      setSendingBox(null)
    }
  }

  const filteredIncoming = incomingBoxes.filter(b => filterCutBoxBySearch(b, searchQuery))
  const filteredOutgoing = outgoingBoxes.filter(b => filterCutBoxBySearch(b, searchQuery))

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    lastUpdated,
    loading,
    receivingBox,
    sendingBox,
    userName,
    confirmModal,
    openConfirm,
    closeConfirm,
    expandedBoxId,
    boxBooks,
    loadingBoxBooks,
    toggleBox,
    fetchBoxes,
    handleReceiveBox,
    handleSendBox,
    filteredIncoming,
    filteredOutgoing,
  }
}
