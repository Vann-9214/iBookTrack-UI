import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  fetchBoxes,
  fetchLiveScanCounts,
  fetchScanRows,
  fetchTransmitRows,
} from '../services/checkpoints.service'
import { hasDataChanged, STAGE_ORDER } from '../utils/checkpoints.helpers'
import type { BoxItem, Stage } from '../types/checkpoints.types'

export function useCheckpointBoxes(brand: string) {
  const [boxes, setBoxes] = useState<BoxItem[]>([])
  const prevBoxesRef = useRef<BoxItem[]>([])
  const [topLoading, setTopLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [scanBooks, setScanBooks] = useState<number | null>(null)
  const [transmitBooks, setTransmitBooks] = useState<number | null>(null)
  const [scanEligibleBoxNums, setScanEligibleBoxNums] = useState<Set<string> | null>(null)
  const [transmitEligibleBoxNums, setTransmitEligibleBoxNums] = useState<Set<string> | null>(null)

  const fetchData = useCallback(async () => {
    setTopLoading(true)
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
    } catch (e) {
      console.error('Failed to fetch checkpoint data:', e)
    } finally {
      setTopLoading(false)
    }
  }, [brand])

  useEffect(() => {
    fetchData()
  }, [fetchData, brand])

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
