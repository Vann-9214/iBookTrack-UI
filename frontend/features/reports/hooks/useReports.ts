import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { LotStatusRow, FilterStatus, SortKey, SortDir } from '../types/reports.types'
import { reportsService } from '../services/reports.service'
import { filterAndSortLots } from '../utils/reports.helpers'

export function useReports(brand: string) {
  const [lots, setLots] = useState<LotStatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  const fetchData = useCallback(async (isBackground?: boolean) => {
    if (isBackground !== true) setLoading(true)
    setError(null)
    try {
      const fetchedLots = await reportsService.fetchLotStatus(brand)
      setLots(fetchedLots)
      const now = new Date()
      setTimestamp(now.toLocaleString())
      setLastUpdated(now)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      if (isBackground !== true) setLoading(false)
    }
  }, [brand])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchDataRef = useRef(fetchData)
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  useEffect(() => {
    import('@/lib/auth-api').then(({ getApiBaseUrl }) => {
      const es = new EventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })
      const handleUpdate = () => fetchDataRef.current(true)
      es.addEventListener('PIPELINE_UPDATED', handleUpdate)
      es.addEventListener('DASHBOARD_REFRESH', handleUpdate)
      es.onerror = () => console.warn('Reports SSE error - reconnecting')
      return () => es.close()
    })
  }, [])

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
