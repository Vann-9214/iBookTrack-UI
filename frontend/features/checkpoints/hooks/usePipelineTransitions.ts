import { useState, useEffect, useRef, useCallback } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { fetchPipelineTransitions } from '../services/checkpoints.service'
import { hasDataChanged } from '../utils/checkpoints.helpers'
import type { Transition, Stage } from '../types/checkpoints.types'
import { getApiBaseUrl } from '@/lib/auth-api'

export function usePipelineTransitions(brand: string) {
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [totalTransitions, setTotalTransitions] = useState(0)
  const [transitionsLoading, setTransitionsLoading] = useState(true)

  const [transitionSearchInput, setTransitionSearchInput] = useState('')
  const [transitionSearch, setTransitionSearch] = useState('')
  const [transitionDateFrom, setTransitionDateFrom] = useState('')
  const [transitionDateTo, setTransitionDateTo] = useState('')
  const [transitionStageFilter, setTransitionStageFilter] = useState<Stage | ''>('')
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null)

  const transitionsPagination = usePagination({ totalItems: totalTransitions, defaultPageSize: 50 })

  const prevTransitionsRef = useRef<Transition[]>([])

  const transitionStageFilterRef = useRef(transitionStageFilter)
  const transitionSearchRef = useRef(transitionSearch)
  const transitionDateFromRef = useRef(transitionDateFrom)
  const transitionDateToRef = useRef(transitionDateTo)
  const transitionOffsetRef = useRef(transitionsPagination.offset)
  const brandRef = useRef(brand)

  useEffect(() => { transitionStageFilterRef.current = transitionStageFilter }, [transitionStageFilter])
  useEffect(() => { transitionSearchRef.current = transitionSearch }, [transitionSearch])
  useEffect(() => { transitionDateFromRef.current = transitionDateFrom }, [transitionDateFrom])
  useEffect(() => { transitionDateToRef.current = transitionDateTo }, [transitionDateTo])
  useEffect(() => { transitionOffsetRef.current = transitionsPagination.offset }, [transitionsPagination.offset])
  useEffect(() => { brandRef.current = brand }, [brand])

  const refresh = useCallback(async (isBackground?: boolean) => {
    if (isBackground !== true) setTransitionsLoading(true)
    try {
      const data = await fetchPipelineTransitions(brandRef.current, {
        offset: transitionOffsetRef.current,
        limit: 50,
        stage: transitionStageFilterRef.current,
        search: transitionSearchRef.current,
        dateFrom: transitionDateFromRef.current,
        dateTo: transitionDateToRef.current,
      })

      console.log('[checkpoints] pipeline-transitions response:', data)

      if (data.success) {
        const newTransitions = data.transitions || []
        const newTotal = data.totalCount || 0
        if (hasDataChanged(prevTransitionsRef.current, newTransitions)) {
          setTransitions(newTransitions)
        }
        setTotalTransitions(newTotal)
        prevTransitionsRef.current = newTransitions
      } else {
        console.warn('[checkpoints] pipeline-transitions success=false:', data)
      }
    } catch (e) {
      console.error('Failed to fetch pipeline transitions:', e)
    } finally {
      if (isBackground !== true) setTransitionsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, brand, transitionStageFilter, transitionSearch, transitionDateFrom, transitionDateTo, transitionsPagination.offset])

  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      refreshRef.current(true)
    }

    es.addEventListener('BOX_UPDATED', handleUpdate)
    es.addEventListener('PIPELINE_UPDATED', handleUpdate)
    es.addEventListener('DASHBOARD_REFRESH', handleUpdate)

    es.onerror = () => {
      console.warn('Pipeline SSE error - reconnecting')
    }

    return () => es.close()
  }, [])

  const applySearch = useCallback(() => {
    setTransitionSearch(transitionSearchInput)
    transitionsPagination.goToPage(1)
  }, [transitionSearchInput, transitionsPagination])

  return {
    transitions,
    totalTransitions,
    transitionsLoading,
    transitionSearchInput,
    setTransitionSearchInput,
    transitionSearch,
    setTransitionSearch,
    transitionDateFrom,
    setTransitionDateFrom,
    transitionDateTo,
    setTransitionDateTo,
    transitionStageFilter,
    setTransitionStageFilter,
    expandedTimelineId,
    setExpandedTimelineId,
    transitionsPagination,
    refresh,
    applySearch,
  }
}
