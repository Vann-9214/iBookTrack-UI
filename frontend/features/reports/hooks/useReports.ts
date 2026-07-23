import { useState, useEffect, useCallback, useMemo } from 'react'
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

  const toggleLot = (lotId: string) => {
    setExpandedLots(prev => {
      const next = new Set(prev)
      if (next.has(lotId)) {
        next.delete(lotId)
      } else {
        next.add(lotId)
        setBoxPageByLot(p => ({ ...p, [lotId]: 1 }))
      }
      return next
    })
  }

  const setBoxPage = (lotId: string, page: number) => {
    setBoxPageByLot(p => ({ ...p, [lotId]: page }))
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [brand])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  return {
    lots,
    filteredLots,
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
