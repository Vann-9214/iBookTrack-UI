import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  fetchBoxes,
  fetchLiveScanCounts,
  fetchScanRows,
  fetchTransmitRows,
  checkSimflexForBox,
} from '../services/checkpoints.service'
import { hasDataChanged, STAGE_ORDER } from '../utils/checkpoints.helpers'
import type { BoxItem, Stage } from '../types/checkpoints.types'
import { getApiBaseUrl } from '@/lib/auth-api'

export function useCheckpointBoxes(brand: string) {
  const [boxes, setBoxes] = useState<BoxItem[]>([])
  const prevBoxesRef = useRef<BoxItem[]>([])
  const [topLoading, setTopLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [scanBooks, setScanBooks] = useState<number | null>(null)
  const [transmitBooks, setTransmitBooks] = useState<number | null>(null)
  const [scanEligibleBoxNums, setScanEligibleBoxNums] = useState<Set<string> | null>(null)
  const [transmitEligibleBoxNums, setTransmitEligibleBoxNums] = useState<Set<string> | null>(null)

  const fetchData = useCallback(async (isBackground?: boolean) => {
    if (isBackground !== true) setTopLoading(true)
    try {
      const [boxData, liveData, scanRowsData, transmitRowsData] = await Promise.all([
        fetchBoxes(brand),
        fetchLiveScanCounts(brand),
        fetchScanRows(brand),
        fetchTransmitRows(brand),
      ])

      if (boxData.boxes && hasDataChanged(prevBoxesRef.current, boxData.boxes)) {
        setBoxes(boxData.boxes)
        prevBoxesRef.current = boxData.boxes
      }

      if (liveData?.success) setScanBooks(liveData.scanWipCount ?? null)

      if (scanRowsData?.success) {
        const eligible = new Set<string>(
          (scanRowsData.rows || [])
            .map((r) => String((r as { BoxNumber?: unknown }).BoxNumber || ''))
            .filter(Boolean)
        )
        setScanEligibleBoxNums(eligible)
      }

      if (transmitRowsData?.success) {
        setTransmitBooks(Number(transmitRowsData.count) || 0)
        const eligible = new Set<string>(
          (transmitRowsData.rows || [])
            .map((r) => String((r as { BoxNumber?: unknown }).BoxNumber || ''))
            .filter(Boolean)
        )
        setTransmitEligibleBoxNums(eligible)
      }

      setLastUpdated(new Date())

      // Auto-sync boxes in 'scan' stage with Simflex
      const scanBoxesToSync = boxData.boxes?.filter((b: BoxItem) => b.current_stage === 'scan' && !b.is_fully_completed_in_simflex) || []
      if (scanBoxesToSync.length > 0) {
        let needsRefresh = false
        await Promise.allSettled(
          scanBoxesToSync.map(async (box: BoxItem) => {
            try {
              const res = await checkSimflexForBox(box.id)
              if (res.autoAdvanced) needsRefresh = true
            } catch (e) {
              // ignore sync errors in background
            }
          })
        )
        if (needsRefresh) {
          const newBoxData = await fetchBoxes(brand)
          if (newBoxData.boxes) {
            setBoxes(newBoxData.boxes)
            prevBoxesRef.current = newBoxData.boxes
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch checkpoint data:', e)
    } finally {
      if (isBackground !== true) setTopLoading(false)
    }
  }, [brand])

  useEffect(() => {
    fetchData()
  }, [fetchData, brand])

  const fetchDataRef = useRef(fetchData)
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      fetchDataRef.current(true)
    }

    es.addEventListener('BOX_UPDATED', handleUpdate)
    es.addEventListener('PIPELINE_UPDATED', handleUpdate)
    es.addEventListener('DASHBOARD_REFRESH', handleUpdate)

    es.onerror = () => {
      console.warn('Checkpoint SSE error - reconnecting')
    }

    return () => es.close()
  }, [])

  const boxesByStage = useMemo(() => {
    return STAGE_ORDER.reduce<Record<Stage, BoxItem[]>>((acc, stage) => {
      let stageBoxes = boxes.filter((b) => {
        if (stage === 'transmit') {
          return b.current_stage === 'scan' && !b.is_fully_completed_in_simflex
        }
        if (stage === 'storage') {
          const isActuallyStorage = b.current_stage === 'storage'
          const isScanButFullyCompleted =
            b.current_stage === 'scan' && b.is_fully_completed_in_simflex
          return isActuallyStorage || isScanButFullyCompleted
        }
        if (stage === 'scan') {
          return b.current_stage === 'scan' && !b.is_fully_completed_in_simflex
        }
        return b.current_stage === stage
      })
      if (stage === 'warehouse') {
        stageBoxes = stageBoxes.filter((b) => b.total_expected_books > 0)
      }
      acc[stage] = stageBoxes
      return acc
    }, {} as Record<Stage, BoxItem[]>)
  }, [boxes])

  return {
    boxes,
    boxesByStage,
    topLoading,
    lastUpdated,
    scanBooks,
    transmitBooks,
    scanEligibleBoxNums,
    transmitEligibleBoxNums,
    fetchData,
  }
}
