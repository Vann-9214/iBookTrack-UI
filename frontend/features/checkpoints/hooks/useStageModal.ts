import { useState, useEffect } from 'react'
import { fetchScanRows, fetchTransmitRows } from '../services/checkpoints.service'
import type { Stage, SimflexRow } from '../types/checkpoints.types'

export function useStageModal(brand: string) {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [stageModalPage, setStageModalPage] = useState(1)
  const [stageModalSearch, setStageModalSearch] = useState('')
  const [simflexRows, setSimflexRows] = useState<SimflexRow[]>([])
  const [simflexRowsLoading, setSimflexRowsLoading] = useState(false)
  const [simflexRowsSearch, setSimflexRowsSearch] = useState('')

  useEffect(() => {
    setStageModalSearch('')
    setSimflexRowsSearch('')
    if (selectedStage !== 'scan' && selectedStage !== 'transmit') {
      setSimflexRows([])
      setSimflexRowsLoading(false)
      return
    }

    setSimflexRowsLoading(true)
    setSimflexRows([])
    const endpoint = selectedStage === 'scan' ? fetchScanRows : fetchTransmitRows
    endpoint(brand)
      .then((d) => {
        if (d?.success) setSimflexRows(d.rows || [])
      })
      .catch(() => {})
      .finally(() => setSimflexRowsLoading(false))
  }, [selectedStage, brand])

  useEffect(() => {
    if (selectedStage) setStageModalPage(1)
  }, [selectedStage])

  return {
    selectedStage,
    setSelectedStage,
    stageModalPage,
    setStageModalPage,
    stageModalSearch,
    setStageModalSearch,
    simflexRows,
    simflexRowsLoading,
    simflexRowsSearch,
    setSimflexRowsSearch,
  }
}
