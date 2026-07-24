'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useBrand } from '@/hooks/use-brand'
import { fetchDashboardData, findBoxByNumber, searchIsbn, searchLotDetails, searchLotRange } from '../services/dashboard.service'
import { buildPipelineStages, getDashboardDisplayText, type SearchResult } from '../utils/dashboard.helpers'

export function useDashboard() {
  const { brand } = useBrand()
  const { toast } = useToast()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchType, setSearchType] = useState<'isbn' | 'lot'>('lot')
  const [searchValue, setSearchValue] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [isRange, setIsRange] = useState(false)
  const [currentLot, setCurrentLot] = useState('')
  const [displayRange, setDisplayRange] = useState<string | null>(null)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastStatsUpdate, setLastStatsUpdate] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [liveScans, setLiveScans] = useState<any[]>([])
  const [boxScanInput, setBoxScanInput] = useState('')
  const [boxScanModal, setBoxScanModal] = useState<{ box: any; books: any[] } | null>(null)
  const [loadingBoxScan, setLoadingBoxScan] = useState(false)

  const fetchStats = useCallback(async (lotNumber?: string) => {
    try {
      const { stats, pipeline, boxes: boxesResponse, live, scanRows, transmitRows } = await fetchDashboardData(brand, lotNumber)
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
        ].filter(Boolean).some((time) => new Date(time).getTime() >= startOfDay)),
      )
      const simflex = live?.success ? live : null
      const transmitBooks = Number(simflex?.transmitBooks) || 0

      if (simflex) setLiveScans(simflex.recentScans || [])
      if (stats.success) {
        setDashboardStats({
          ...stats.stats,
          pipelineStages: buildPipelineStages(boxes, pipeline.activeTransmitBooks || 0),
          pipelineToday: pipeline.today,
          dailyTransmitted: Number(simflex?.summary?.completedTransmissions) || 0,
          totalBooks: Number(simflex?.allTimeTotal) || stats.stats.totalBooks,
          scanWipCount: Number(simflex?.scanWipCount) || 0,
          scanEligibleBoxNums: scanRows?.success ? scanRows.rows?.map((row: any) => String(row.BoxNumber || '')).filter(Boolean) : [],
          transmitEligibleBoxNums: transmitRows?.success ? transmitRows.rows?.map((row: any) => String(row.BoxNumber || '')).filter(Boolean) : [],
        })
        setLastStatsUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }, [brand])

  const handleSearch = useCallback(async () => {
    if (searchType === 'isbn' && !searchValue.trim()) return toast({ title: 'Error', description: 'Please enter an ISBN', variant: 'destructive' })
    if (searchType === 'lot' && !isRange && !searchValue.trim()) return toast({ title: 'Error', description: 'Please enter a Lot number', variant: 'destructive' })
    if (isRange && (!rangeStart || !rangeEnd)) return toast({ title: 'Error', description: 'Please enter both range values', variant: 'destructive' })

    setLoading(true)
    try {
      if (searchType === 'isbn') {
        const data = await searchIsbn(searchValue.trim())
        if (!data.success || !data.book) {
          setSearchResult(null)
          toast({ title: 'Not Found', description: data.message || 'ISBN not found in iLMS or database', variant: 'destructive' })
          return
        }
        setSearchResult({ type: 'isbn', data: data.book, books: [data.book] })
        toast({ title: data.book.in_warehouse ? 'Book Found in Warehouse' : data.book.in_ilms ? 'Book Found in iLMS' : 'Book Found', description: data.book.in_warehouse ? `Located in ${data.book.box_number || 'Unknown Box'}` : 'Book information retrieved' })
      } else if (isRange) {
        const data = await searchLotRange(rangeStart, rangeEnd)
        setDisplayRange(`${rangeStart} – ${rangeEnd}`)
        setCurrentLot('')
        if (data.success) setSearchResult({ type: 'lot', data: data.stats, books: [] })
      } else {
        const lotNumber = searchValue.trim()
        setCurrentLot(lotNumber)
        setDisplayRange(null)
        await fetchStats(lotNumber)
        const data = await searchLotDetails(lotNumber)
        if (!data.success || !data.lotDetails) {
          setSearchResult(null)
          toast({ title: 'Not Found', description: `Lot "${lotNumber}" not found. Check the exact lot number as it appears in the system.`, variant: 'destructive' })
          return
        }
        setSearchResult({ type: 'lot', data: data.lotDetails, books: [] })
        toast({ title: 'Lot Found', description: `${data.lotDetails.total_books} books across ${data.lotDetails.total_boxes} boxes` })
      }
      setSearchOpen(true)
    } catch (error) {
      console.error('Search error:', error)
      toast({ title: 'Error', description: 'Failed to search', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [fetchStats, isRange, rangeEnd, rangeStart, searchType, searchValue, toast])

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetchStats(currentLot || undefined)
      if (searchResult) await handleSearch()
      setRefreshKey((key) => key + 1)
    } finally {
      setIsRefreshing(false)
    }
  }, [currentLot, fetchStats, handleSearch, searchResult])

  const clearSearch = useCallback(() => {
    setSearchResult(null)
    setSearchValue('')
    setRangeStart('')
    setRangeEnd('')
    setCurrentLot('')
    setDisplayRange(null)
    void fetchStats()
  }, [fetchStats])

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
    setIsRefreshing(true)
    void fetchStats().finally(() => setIsRefreshing(false))
  }, [brand])

  return {
    brand, searchOpen, setSearchOpen, searchType, setSearchType, searchValue, setSearchValue, rangeStart, setRangeStart, rangeEnd, setRangeEnd, isRange, setIsRange, searchResult, loading, dashboardStats, isRefreshing, lastStatsUpdate, refreshKey, liveScans, boxScanInput, setBoxScanInput, boxScanModal, setBoxScanModal, loadingBoxScan, handleSearch, handleBoxScan, refreshAll, clearSearch,
    displayText: getDashboardDisplayText(currentLot, displayRange),
  }
}
