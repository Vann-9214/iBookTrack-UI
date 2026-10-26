'use client'
import { DemoEventSource } from '@/lib/mock-data/events'


import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { useToast } from '@/hooks/use-toast'
import { useBrand } from '@/hooks/use-brand'
import { getApiBaseUrl } from '@/lib/auth-api'
import { fetchDashboardData, findBoxByNumber, searchIsbn } from '../services/dashboard.service'
import { buildPipelineStages, getDashboardDisplayText, type SearchResult } from '../utils/dashboard.helpers'

export function useDashboard() {
  const { brand } = useBrand()
  const { toast } = useToast()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const [boxScanInput, setBoxScanInput] = useState('')
  const [boxScanModal, setBoxScanModal] = useState<{ box: any; books: any[] } | null>(null)
  const [loadingBoxScan, setLoadingBoxScan] = useState(false)

  const fetchStats = async () => {
    const { stats, pipeline, boxes: boxesResponse, live, scanRows, transmitRows } = await fetchDashboardData(brand)
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    const boxes = (boxesResponse.boxes || []).filter((box: any) =>
      box.box_sessions?.some((session: any) => [
        session.warehouse_time_received,
        session.inventory_time_received,
        session.inventory_time_send,
        session.cut_time_received,
        session.cut_time_send,
        session.endorsement_time_received,
        session.endorsement_time_send,
        session.scan_time_received,
        box.latest_inventory_scan_at,
        box.latest_endorsement_scan_at,
      ].filter(Boolean).some((time: any) => new Date(time).getTime() >= startOfDay)),
    )
    const simflex = live?.success ? live : null

    const newDashboardStats = {
      ...stats?.stats,
      pipelineStages: buildPipelineStages(boxes, pipeline?.activeTransmitBooks || 0),
      pipelineToday: pipeline?.today,
      dailyTransmitted: Number(simflex?.summary?.completedTransmissions) || 0,
      totalBooks: Number(simflex?.allTimeTotal) || stats?.stats?.totalBooks || 0,
      scanWipCount: Number(simflex?.scanWipCount) || 0,
      scanEligibleBoxNums: scanRows?.success ? scanRows.rows?.map((row: any) => String(row.BoxNumber || '')).filter(Boolean) : [],
      transmitEligibleBoxNums: transmitRows?.success ? transmitRows.rows?.map((row: any) => String(row.BoxNumber || '')).filter(Boolean) : [],
    }

    return {
      stats: newDashboardStats,
      liveScans: simflex ? (simflex.recentScans || []) : []
    }
  }

  const { data, isLoading, isValidating, mutate } = useSWR(
    brand ? ['dashboard_stats', brand] : null,
    fetchStats,
    { 
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  )

  const isInitialLoading = isLoading || !data
  const isRefreshing = isValidating
  const dashboardStats = data?.stats || null
  const liveScans = data?.liveScans || []
  const lastStatsUpdate = data ? new Date() : null

  const handleSearch = useCallback(async () => {
    if (!searchValue.trim()) return toast({ title: 'Error', description: 'Please enter an ISBN', variant: 'destructive' })

    setLoading(true)
    try {
      const data = await searchIsbn(searchValue.trim())
      if (!data || !data.success || !data.book) {
        setSearchResult(null)
        toast({ title: 'Not Found', description: data?.message || 'ISBN not found in iLMS or database', variant: 'destructive' })
        return
      }
      setSearchResult({ type: 'isbn', data: data.book, books: [data.book] })
      toast({ title: data.book.in_warehouse ? 'Book Found in Warehouse' : data.book.in_ilms ? 'Book Found in iLMS' : 'Book Found', description: data.book.in_warehouse ? `Located in ${data.book.box_number || 'Unknown Box'}` : 'Book information retrieved' })
      setSearchOpen(true)
    } catch (error) {
      console.error('Search error:', error)
      toast({ title: 'Error', description: 'Failed to search', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [searchValue, toast])

  const refreshAll = useCallback(async () => {
    await mutate()
    if (searchResult) await handleSearch()
    setRefreshKey((key) => key + 1)
  }, [mutate, handleSearch, searchResult])

  const clearSearch = useCallback(() => {
    setSearchResult(null)
    setSearchValue('')
    void mutate()
  }, [mutate])

  const handleBoxScan = useCallback(async () => {
    const boxNumber = boxScanInput.trim()
    if (!boxNumber) return
    setBoxScanModal(null)
    setLoadingBoxScan(true)
    try {
      const data = await findBoxByNumber(boxNumber)
      if (data.box) setBoxScanModal({ box: data.box, books: data.box.books || [] })
      else toast({ title: 'Not Found', description: `Box "${boxNumber}" not found`, variant: 'destructive' })
    } catch {
      toast({ title: 'Error', description: 'Failed to look up box', variant: 'destructive' })
    } finally {
      setLoadingBoxScan(false)
      setBoxScanInput('')
    }
  }, [boxScanInput, toast])

  useEffect(() => {
    const es = new DemoEventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })

    const handleUpdate = () => {
      mutate()
    }

    es.addEventListener('WAREHOUSE_LOCKED', handleUpdate)
    es.addEventListener('WAREHOUSE_UNLOCKED', handleUpdate)
    es.addEventListener('WAREHOUSE_DELAYED', handleUpdate)
    es.addEventListener('INVENTORY_LOCKED', handleUpdate)
    es.addEventListener('INVENTORY_UNLOCKED', handleUpdate)
    es.addEventListener('INVENTORY_DELAYED', handleUpdate)
    es.addEventListener('BOX_UPDATED', handleUpdate)
    es.addEventListener('PIPELINE_UPDATED', handleUpdate)
    es.addEventListener('FLAG_UPDATED', handleUpdate)
    es.addEventListener('DASHBOARD_REFRESH', handleUpdate)

    es.onerror = () => {
      console.warn('Dashboard SSE error - reconnecting')
    }

    return () => es.close()
  }, [mutate])

  return {
    brand, searchOpen, setSearchOpen, searchValue, setSearchValue, searchResult, loading, dashboardStats, isInitialLoading, isRefreshing, lastStatsUpdate, refreshKey, liveScans, boxScanInput, setBoxScanInput, boxScanModal, setBoxScanModal, loadingBoxScan, handleSearch, handleBoxScan, refreshAll, clearSearch,
    displayText: getDashboardDisplayText('', null),
  }
}
