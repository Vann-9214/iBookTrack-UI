import { DemoEventSource } from '@/lib/mock-data/events'
import { getApiBaseUrl } from '@/lib/auth-api'
import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { LotStatusRow, FilterStatus, SortKey, SortDir } from '../types/reports.types'
import { reportsService } from '../services/reports.service'
import { filterAndSortLots } from '../utils/reports.helpers'

export function useReports(brand: string) {
  const [timestamp, setTimestamp] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [sortKey, setSortKey] = useState<SortKey>('progress')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set())
  const [boxPageByLot, setBoxPageByLot] = useState<Record<string, number>>({})
  const [page, setPage] = useState(1)

  const LOTS_PER_PAGE = 10

  const toggleLot = (lotId: string) => {
    // If the lot wasn't expanded yet, reset its page to 1
    if (!expandedLots.has(lotId)) {
      setBoxPageByLot(p => ({ ...p, [lotId]: 1 }))
    }
    
    setExpandedLots(prev => {
      const next = new Set(prev)
      if (next.has(lotId)) {
        next.delete(lotId)
      } else {
        next.add(lotId)
      }
      return next
    })
  }

  const setBoxPage = (lotId: string, page: number) => {
    setBoxPageByLot(p => ({ ...p, [lotId]: page }))
  }

  const { data, isLoading, isValidating, error: swrError, mutate } = useSWR(
    brand ? ['reports_data', brand] : null,
    async () => {
      const fetchedLots = await reportsService.fetchLotStatus(brand)
      const now = new Date()
      setTimestamp(now.toLocaleString())
      setLastUpdated(now)
      return fetchedLots
    },
    { 
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  const loading = isLoading || !data
  const isRefreshing = isValidating
  const lots = data || []
  const error = swrError instanceof Error ? swrError.message : swrError ? String(swrError) : null

  const fetchData = useCallback(async () => {
    await mutate()
  }, [mutate])

  useEffect(() => {
      const es = new DemoEventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })
      const handleUpdate = () => mutate()
      es.addEventListener('PIPELINE_UPDATED', handleUpdate)
      es.addEventListener('DASHBOARD_REFRESH', handleUpdate)
      es.onerror = () => console.warn('Reports SSE error - reconnecting')
      return () => es.close()
  }, [mutate])

  const counts = useMemo(() => ({
    all: lots.length,
    closed: lots.filter(l => l.computed_status === 'closed').length,
    open: lots.filter(l => l.computed_status === 'open').length,
    'in-progress': lots.filter(l => l.computed_status === 'in-progress').length,
  }), [lots])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filteredLots = useMemo(() => {
    return filterAndSortLots(lots, filter, search, sortKey, sortDir)
  }, [lots, filter, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredLots.length / LOTS_PER_PAGE))

  useEffect(() => {
    setPage(1)
  }, [filter, search, sortKey, sortDir])

  useEffect(() => {
    setPage(p => Math.min(p, totalPages))
  }, [totalPages])

  const paginatedLots = useMemo(() => {
    const start = (page - 1) * LOTS_PER_PAGE
    return filteredLots.slice(start, start + LOTS_PER_PAGE)
  }, [filteredLots, page])

  return {
    lots,
    filteredLots,
    paginatedLots,
    page,
    setPage,
    totalPages,
    loading,
    isRefreshing,
    error,
    timestamp,
    lastUpdated,
    filter,
    setFilter,
    sortKey,
    sortDir,
    handleSort,
    search,
    setSearch,
    expandedLots,
    toggleLot,
    boxPageByLot,
    setBoxPage,
    fetchData,
    counts,
  }
}
