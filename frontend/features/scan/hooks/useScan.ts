import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { fetchUserProfile } from "@/lib/auth-api"
import { useBrand } from "@/hooks/use-brand"
import { BoxEntry, BookInBox } from "../types/scan.types"
import { filterIncomingBoxes } from "../utils/scan.helpers"
import { fetchIncomingBoxes, fetchBoxDetails, advanceBoxToScan } from "../services/scan.service"

export function useScan() {
  const { brand } = useBrand()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    fetchUserProfile().then(profile => {
      if (profile?.name) setUserName(profile.name)
    })
  }, [])

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [receivingBox, setReceivingBox] = useState<string | null>(null)

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; box: BoxEntry | null }>({
    open: false,
    box: null,
  })

  const openConfirm = (box: BoxEntry) => setConfirmModal({ open: true, box })
  const closeConfirm = () => setConfirmModal({ open: false, box: null })

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
        const books = await fetchBoxDetails(boxId)
        setBoxBooks(prev => ({ ...prev, [boxId]: books }))
      } catch (e) {
        setBoxBooks(prev => ({ ...prev, [boxId]: [] }))
      } finally {
        setLoadingBoxBooks(null)
      }
    }
  }

  const fetchBoxes = useCallback(async () => {
    setLoading(true)
    try {
      // Always fetch all incoming boxes; search is filtered client-side below.
      const allIncoming = await fetchIncomingBoxes(brand, '', 'box')
      setIncomingBoxes(allIncoming)
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

  const filteredIncoming = filterIncomingBoxes(incomingBoxes, searchQuery)

  const handleReceiveBox = async (box: BoxEntry) => {
    setReceivingBox(box.id)
    try {
      await advanceBoxToScan(box.id)
      toast.success(`${box.box_number} received`)
      fetchBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceivingBox(null)
    }
  }

  return {
    brand,
    userName,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    incomingBoxes: filteredIncoming,
    loading,
    receivingBox,
    confirmModal,
    openConfirm,
    closeConfirm,
    expandedBoxId,
    boxBooks,
    loadingBoxBooks,
    toggleBox,
    fetchBoxes,
    handleReceiveBox,
  }
}
