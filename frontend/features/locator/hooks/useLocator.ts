import { useState, useEffect, useCallback, useRef } from "react"
import useSWR from 'swr'
import { StorageLocation, ReadyBox, PendingAssignment } from "../types/locator.types"
import { locatorService } from "../services/locator.service"
import { getSuggestedLocation } from "../utils/locator.helpers"

export function useLocator(brand: string) {
  const { data, isLoading, isValidating, error: swrError, mutate } = useSWR(
    brand ? ['locator_data', brand] : null,
    async () => {
      const [locations, readyBoxes, pendingAssignments] = await Promise.all([
        locatorService.fetchLocations(),
        locatorService.fetchReadyBoxes(brand),
        locatorService.fetchPendingAssignments(brand)
      ])
      return { locations, readyBoxes, pendingAssignments }
    },
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  )

  const locations = data?.locations || []
  const readyBoxes = data?.readyBoxes || []
  const pendingAssignments = data?.pendingAssignments || []
  const loadingLocations = isLoading || !data
  const loadingReady = isLoading || !data
  const loadingPending = isLoading || !data
  const isRefreshing = isValidating
  const error = swrError instanceof Error ? swrError.message : swrError ? String(swrError) : null
  const lastUpdated = data ? new Date() : null

  const setLocations = useCallback((updater: React.SetStateAction<StorageLocation[]>) => {
    mutate((prev: any) => ({
      ...prev,
      locations: typeof updater === 'function' ? updater(prev?.locations || []) : updater
    }), false)
  }, [mutate])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [expandedPendingLocations, setExpandedPendingLocations] = useState<Set<string>>(new Set())

  // Slot detail modal state
  const [detailSlot, setDetailSlot] = useState<StorageLocation | null>(null)
  const [expandedBox, setExpandedBox] = useState<string | null>(null)

  // Assign modal state
  const [assignSlot, setAssignSlot] = useState<StorageLocation | null>(null)
  const [assigningBoxIds, setAssigningBoxIds] = useState<Set<string>>(new Set())
  const [selectedReadyBoxIds, setSelectedReadyBoxIds] = useState<Set<string>>(new Set())
  const [assignLoading, setAssignLoading] = useState(false)

  // Removal state
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [selectedRemoveAssignments, setSelectedRemoveAssignments] = useState<Set<string>>(new Set())

  const fetchLocations = useCallback(async () => { await mutate() }, [mutate])
  const fetchReadyBoxes = useCallback(async () => { await mutate() }, [mutate])
  const fetchPendingAssignments = useCallback(async () => { await mutate() }, [mutate])
  const refreshLocator = useCallback(async () => { await mutate() }, [mutate])

  useEffect(() => {
    import('@/lib/auth-api').then(({ getApiBaseUrl }) => {
      const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })
      const handleUpdate = () => mutate()
      es.addEventListener('BOX_UPDATED', handleUpdate)
      es.addEventListener('PIPELINE_UPDATED', handleUpdate)
      es.addEventListener('STORAGE_UPDATED', handleUpdate)
      es.addEventListener('DASHBOARD_REFRESH', handleUpdate)
      es.onerror = () => console.warn('Locator SSE error - reconnecting')
      return () => es.close()
    })
  }, [])

  // Keep detailSlot in sync after location refresh
  useEffect(() => {
    if (detailSlot) {
      const updated = locations.find(l => l.id === detailSlot.id)
      if (updated) setDetailSlot(updated)
    }
  }, [locations])

  const openAssign = async (loc: StorageLocation, boxId?: string, setActiveSection?: (shelf: number) => void) => {
    setAssignSlot(loc)
    setAssigningBoxIds(selectedReadyBoxIds.size > 0 ? new Set(selectedReadyBoxIds) : boxId ? new Set([boxId]) : new Set())
    await fetchReadyBoxes()
  }

  const selectReadyBox = (box: ReadyBox, setActiveSection?: (shelf: number) => void) => {
    const next = new Set(selectedReadyBoxIds)
    if (next.has(box.id)) next.delete(box.id)
    else next.add(box.id)
    setSelectedReadyBoxIds(next)
    const suggestedLocation = getSuggestedLocation(locations, next.size)
    if (suggestedLocation && setActiveSection) setActiveSection(suggestedLocation.shelf)
  }

  const handleAssign = async () => {
    if (!assignSlot || assigningBoxIds.size === 0) return
    setAssignLoading(true)
    try {
      await locatorService.assignBatch(Array.from(assigningBoxIds), assignSlot.id)
      setAssignSlot(null)
      setAssigningBoxIds(new Set())
      setSelectedReadyBoxIds(new Set())
      await Promise.all([fetchLocations(), fetchReadyBoxes(), fetchPendingAssignments()])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to assign boxes')
    } finally {
      setAssignLoading(false)
    }
  }

  const handleConfirmAssignments = async (groupId: string, assignmentIds: string[]) => {
    setConfirmingId(groupId)
    try {
      await Promise.all(assignmentIds.map(id => locatorService.confirmAssignment(id)))
      await Promise.all([fetchLocations(), fetchPendingAssignments()])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to confirm placements')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleRemovePendingAssignments = async (assignmentIds: string[], groupId?: string) => {
    setRemovingIds(new Set(assignmentIds))
    try {
      await locatorService.removeAssignmentsBatch(assignmentIds)
      if (groupId) {
        setExpandedPendingLocations(prev => {
          const next = new Set(prev)
          next.delete(groupId)
          return next
        })
      }
      await Promise.all([fetchLocations(), fetchReadyBoxes(), fetchPendingAssignments()])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove pending assignments')
    } finally {
      setRemovingIds(new Set())
    }
  }

  const handleRemoveBatch = async () => {
    if (selectedRemoveAssignments.size === 0) return
    setRemovingIds(new Set(selectedRemoveAssignments))
    try {
      await locatorService.removeAssignmentsBatch(Array.from(selectedRemoveAssignments))
      setSelectedRemoveAssignments(new Set())
      await Promise.all([fetchLocations(), fetchReadyBoxes(), fetchPendingAssignments()])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove boxes')
    } finally {
      setRemovingIds(new Set())
    }
  }

  return {
    locations,
    setLocations,
    readyBoxes,
    pendingAssignments,
    loadingLocations,
    loadingReady,
    loadingPending,
    error,
    lastUpdated,
    confirmingId,
    expandedPendingLocations,
    setExpandedPendingLocations,
    detailSlot,
    setDetailSlot,
    expandedBox,
    setExpandedBox,
    assignSlot,
    setAssignSlot,
    assigningBoxIds,
    setAssigningBoxIds,
    selectedReadyBoxIds,
    setSelectedReadyBoxIds,
    assignLoading,
    removingIds,
    selectedRemoveAssignments,
    setSelectedRemoveAssignments,
    refreshLocator,
    openAssign,
    selectReadyBox,
    handleAssign,
    handleConfirmAssignments,
    handleRemovePendingAssignments,
    handleRemoveBatch,
    isRefreshing
  }
}
