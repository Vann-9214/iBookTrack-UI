import { useState, useEffect, useCallback } from "react"
import { StorageLocation, ReadyBox, PendingAssignment } from "../types/locator.types"
import { locatorService } from "../services/locator.service"
import { getSuggestedLocation } from "../utils/locator.helpers"

export function useLocator(brand: string) {
  const [locations, setLocations] = useState<StorageLocation[]>([])
  const [readyBoxes, setReadyBoxes] = useState<ReadyBox[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [loadingReady, setLoadingReady] = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
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

  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true)
    setError(null)
    try {
      const data = await locatorService.fetchLocations()
      setLocations(data)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoadingLocations(false)
    }
  }, [])

  const fetchReadyBoxes = useCallback(async () => {
    setLoadingReady(true)
    try {
      const data = await locatorService.fetchReadyBoxes(brand)
      setReadyBoxes(data)
    } finally {
      setLoadingReady(false)
    }
  }, [brand])

  const fetchPendingAssignments = useCallback(async () => {
    setLoadingPending(true)
    try {
      const data = await locatorService.fetchPendingAssignments(brand)
      setPendingAssignments(data)
    } finally {
      setLoadingPending(false)
    }
  }, [brand])

  const refreshLocator = useCallback(async () => {
    await Promise.all([fetchLocations(), fetchReadyBoxes(), fetchPendingAssignments()])
  }, [fetchLocations, fetchReadyBoxes, fetchPendingAssignments])

  useEffect(() => { fetchLocations() }, [fetchLocations])

  useEffect(() => {
    if (assignSlot) {
      fetchReadyBoxes()
    }
  }, [brand, assignSlot, fetchReadyBoxes])

  useEffect(() => {
    fetchReadyBoxes()
    fetchPendingAssignments()
  }, [brand, fetchReadyBoxes, fetchPendingAssignments])

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

  const isRefreshing = loadingLocations || loadingReady || loadingPending

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
