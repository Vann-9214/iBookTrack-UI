import { useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import {
  fetchAllCheckpointData,
} from '../services/checkpoints.service'
import { STAGE_ORDER } from '../utils/checkpoints.helpers'
import type { BoxItem, Stage } from '../types/checkpoints.types'
import { getApiBaseUrl } from '@/lib/auth-api'

export function useCheckpointBoxes(brand: string) {
  const { data, isLoading, isValidating, mutate } = useSWR(
    brand ? ['checkpoints_data', brand] : null,
    () => fetchAllCheckpointData(brand),
    { 
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  const topLoading = isLoading || !data
  const isRefreshing = isValidating

  const boxes = data?.boxData?.boxes || []
  const lastUpdated = data ? new Date() : null

  const scanBooks = data?.liveData?.success ? (data.liveData.scanWipCount ?? null) : null
  const transmitBooks = data?.transmitRowsData?.success ? (Number(data.transmitRowsData.count) || 0) : null

  const scanEligibleBoxNums = useMemo(() => {
    if (!data?.scanRowsData?.success) return null
    return new Set<string>(
      (data.scanRowsData.rows || [])
        .map((r: any) => String(r.BoxNumber || ''))
        .filter(Boolean)
    )
  }, [data?.scanRowsData])

  const transmitEligibleBoxNums = useMemo(() => {
    if (!data?.transmitRowsData?.success) return null
    return new Set<string>(
      (data.transmitRowsData.rows || [])
        .map((r: any) => String(r.BoxNumber || ''))
        .filter(Boolean)
    )
  }, [data?.transmitRowsData])

  const fetchData = useCallback(async () => {
    await mutate()
  }, [mutate])

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      mutate()
    }

    es.addEventListener('BOX_UPDATED', handleUpdate)
    es.addEventListener('PIPELINE_UPDATED', handleUpdate)
    es.addEventListener('DASHBOARD_REFRESH', handleUpdate)

    es.onerror = () => {
      console.warn('Checkpoint SSE error - reconnecting')
    }

    return () => es.close()
  }, [mutate])

  const boxesByStage = useMemo(() => {
    return STAGE_ORDER.reduce<Record<Stage, BoxItem[]>>((acc, stage) => {
      let stageBoxes = boxes.filter((b: BoxItem) => {
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
        stageBoxes = stageBoxes.filter((b: BoxItem) => b.total_expected_books > 0)
      }
      acc[stage] = stageBoxes
      return acc
    }, {} as Record<Stage, BoxItem[]>)
  }, [boxes])

  return {
    boxes,
    boxesByStage,
    topLoading,
    isRefreshing,
    lastUpdated,
    scanBooks,
    transmitBooks,
    scanEligibleBoxNums,
    transmitEligibleBoxNums,
    fetchData,
  }
}
