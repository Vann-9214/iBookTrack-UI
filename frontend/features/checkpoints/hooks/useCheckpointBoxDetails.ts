import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  fetchBoxById,
  fetchSimflexStatus,
  checkSimflexForBox as checkSimflexForBoxApi,
} from '../services/checkpoints.service'
import type {
  BoxItem,
  ScannedBook,
  SimflexStatusResult,
  StageBoxDetail,
  SimflexCheckResult,
} from '../types/checkpoints.types'

export function useCheckpointBoxDetails(brand: string) {
  const { toast } = useToast()

  const [scannedBox, setScannedBox] = useState<{ box: BoxItem; books: ScannedBook[] } | null>(null)
  const [loadingScannedBox, setLoadingScannedBox] = useState(false)
  const [boxDetailsSimflex, setBoxDetailsSimflex] = useState<Record<string, SimflexStatusResult>>({})
  const [loadingBoxDetailsSimflex, setLoadingBoxDetailsSimflex] = useState(false)

  const [checkingSimflexBoxId, setCheckingSimflexBoxId] = useState<string | null>(null)
  const [simflexCheckResult, setSimflexCheckResult] = useState<SimflexCheckResult | null>(null)

  const [expandedStageBoxId, setExpandedStageBoxId] = useState<string | null>(null)
  const [stageBoxDetails, setStageBoxDetails] = useState<Record<string, StageBoxDetail>>({})
  const openBoxDetails = useCallback(async (box: BoxItem) => {
    setLoadingScannedBox(true)
    setScannedBox(null)
    setBoxDetailsSimflex({})
    try {
      const data = await fetchBoxById(box.id)
      const books: ScannedBook[] = data.box?.books || []
      setScannedBox({ box, books })

      if (box.current_stage === 'scan' && books.length > 0) {
        setLoadingBoxDetailsSimflex(true)
        const isbns = [...new Set(books.filter((b) => b.scan_status === 'processable').map((b) => b.isbn))]
        if (isbns.length > 0) {
          try {
            const simData = await fetchSimflexStatus(isbns, brand)
            if (simData.success && simData.statuses) setBoxDetailsSimflex(simData.statuses)
          } catch {
            // Simflex status is optional; don't block the modal
          }
        }
        setLoadingBoxDetailsSimflex(false)
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load box contents' })
    } finally {
      setLoadingScannedBox(false)
    }
  }, [brand, toast])
  const handleCheckSimflexForBox = useCallback(async (box: BoxItem, onAdvance?: () => Promise<void>) => {
    setCheckingSimflexBoxId(box.id)
    setSimflexCheckResult(null)
    try {
      const data = await checkSimflexForBoxApi(box.id)
      if (!data.success) {
        const message = data.error || 'Simflex check failed'
        setSimflexCheckResult({ boxId: box.id, message, success: false })
        toast({ variant: 'destructive', title: message })
        return
      }
      setSimflexCheckResult({
        boxId: box.id,
        message:
          data.message ||
          (data.autoAdvanced
            ? 'Box fully completed and advanced to Storage!'
            : 'Not all books are completed yet.'),
        success: true,
        autoAdvanced: data.autoAdvanced,
      })
      if (data.autoAdvanced) {
        toast({ title: 'Box fully completed and advanced to Storage!' })
        await onAdvance?.()
      } else {
        toast({ variant: 'destructive', title: 'Cannot advance: Not all processable books are completed.' })
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Simflex check failed'
      setSimflexCheckResult({ boxId: box.id, message, success: false })
      toast({ variant: 'destructive', title: message })
    } finally {
      setCheckingSimflexBoxId(null)
    }
  }, [toast])

  const toggleStageBoxDetails = useCallback(async (box: BoxItem) => {
    if (expandedStageBoxId === box.id) {
      setExpandedStageBoxId(null)
      return
    }
    setExpandedStageBoxId(box.id)
    if (stageBoxDetails[box.id]) return

    setStageBoxDetails((prev) => ({
      ...prev,
      [box.id]: { books: [], simflex: {}, loading: true, loadingSimflex: false },
    }))
    try {
      const data = await fetchBoxById(box.id)
      const books: ScannedBook[] = data.box?.books || []
      const details: StageBoxDetail = { books, simflex: {}, loading: false, loadingSimflex: false }

      if (box.current_stage === 'scan' && books.length > 0) {
        const isbns = [...new Set(books.filter((b) => b.scan_status === 'processable').map((b) => b.isbn))]
        if (isbns.length > 0) {
          details.loadingSimflex = true
          setStageBoxDetails((prev) => ({ ...prev, [box.id]: { ...details, loadingSimflex: true } }))
          try {
            // Disabled Simflex check for now based on request
          } catch {
            // Simflex status is optional
          }
          details.loadingSimflex = false
        }
      }

      setStageBoxDetails((prev) => ({ ...prev, [box.id]: details }))
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load box contents' })
      setStageBoxDetails((prev) => ({
        ...prev,
        [box.id]: { books: [], simflex: {}, loading: false, loadingSimflex: false },
      }))
    }
  }, [expandedStageBoxId, stageBoxDetails, toast])

  return {
    scannedBox,
    loadingScannedBox,
    boxDetailsSimflex,
    loadingBoxDetailsSimflex,
    checkingSimflexBoxId,
    simflexCheckResult,
    expandedStageBoxId,
    stageBoxDetails,
    setScannedBox,
    setSimflexCheckResult,
    setExpandedStageBoxId,
    openBoxDetails,
    handleCheckSimflexForBox,
    toggleStageBoxDetails,
  }
}
