'use client'
import { DemoEventSource } from '@/lib/mock-data/events'
import { getApiBaseUrl } from '@/lib/auth-api'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { useBrand } from '@/hooks/use-brand'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUser } from '@/hooks/use-user'
import { usePagination } from '@/hooks/usePagination'
import {
  fetchLiveTransmissionData,
  fetchRanking,
  exportTransmissionCsv,
  enrichIlms,
} from '../services/transmission.service'
import type {
  EnrichedData,
  LiveSummary,
  PipelineStageSummary,
  RankingResponse,
  ScanBook,
  StageFilter,
  TableView,
} from '../types/transmission.types'
import { formatPipelineStage, parseStatus, todayStr } from '../utils/transmission.helpers'

export function useTransmission() {
  const { brand } = useBrand()
  const isMobile = useIsMobile()

  // Date & process filters
  const [fromDate, setFromDate] = useState(todayStr())
  const [toDate, setToDate] = useState(todayStr())
  const [fromDateOpenMobile, setFromDateOpenMobile] = useState(false)
  const [fromDateOpenDesktop, setFromDateOpenDesktop] = useState(false)
  const [toDateOpenMobile, setToDateOpenMobile] = useState(false)
  const [toDateOpenDesktop, setToDateOpenDesktop] = useState(false)
  const [newProcessOnly, setNewProcessOnly] = useState(false)

  // Live feed state
  const [historySearch, setHistorySearch] = useState('')
  const [historySearchOpen, setHistorySearchOpen] = useState(false)
  const { data, isLoading, mutate } = useSWR(
    brand ? ['live_transmission', brand, fromDate, toDate, newProcessOnly] : null,
    async () => {
      return await fetchLiveTransmissionData({
        from: fromDate,
        to: toDate,
        location: brand,
        newProcessOnly,
      })
    },
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  )

  const loading = isLoading || !data

  const summary = data?.summary || null
  const stages = data?.byStage || []
  const recentScans = data?.recentScans || []
  const allBooks = data?.allBooks || []
  const totalBooks = data?.totalBooks || 0
  const wipCount = data?.wipCount || 0
  const byMachine = data?.byMachine || []
  const limitReached = data?.limitReached || false
  const lastUpdated = data ? new Date() : null
  const [tableView, setTableView] = useState<TableView>('books')
  const [stageFilter, setStageFilter] = useState<StageFilter | null>(null)
  const [enrichedData, setEnrichedData] = useState<Record<string, EnrichedData>>({})
  const fetchedIsbns = useRef<Set<string>>(new Set())

  // Manager flag.
  // The role is taken from the authenticated profile the backend returns
  // (useUser → /api/auth/profile) rather than from localStorage, which the
  // browser owner can edit freely to grant themselves elevated views.
  const { user } = useUser()
  const isManager = user?.role === 'supervisor'

  const fetchLiveData = useCallback(async () => {
    await mutate()
  }, [mutate])

  useEffect(() => {
      const es = new DemoEventSource(`${getApiBaseUrl()}/api/events`, { withCredentials: true })
      const handleUpdate = () => mutate()
      es.addEventListener('SCAN_UPDATED', handleUpdate)
      es.addEventListener('PIPELINE_UPDATED', handleUpdate)
      es.addEventListener('DASHBOARD_REFRESH', handleUpdate)
      es.onerror = () => console.warn('Transmission SSE error - reconnecting')
      return () => es.close()
  }, [mutate])

  // Ranking
  const [showRanking, setShowRanking] = useState(false)
  const [ranking, setRanking] = useState<RankingResponse | null>(null)
  const [rankingLoading, setRankingLoading] = useState(false)

  const fetchRankingData = useCallback(async () => {
    setRankingLoading(true)
    try {
      const data = await fetchRanking(brand)
      setRanking(data)
    } catch (e) {
      console.error('Failed to fetch ranking:', e)
    } finally {
      setRankingLoading(false)
    }
  }, [brand])

  const handleOpenRanking = useCallback(() => {
    setShowRanking(true)
    fetchRankingData()
  }, [fetchRankingData])

  // Export
  const [exporting, setExporting] = useState(false)
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const blob = await exportTransmissionCsv({ date: fromDate, location: brand })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scanning-${brand}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }, [fromDate, brand])

  // Derived metrics
  const transmissionStage = useMemo(
    () => stages.find((s) => s.Stage === 'Transmission_Archive'),
    [stages]
  )
  const totalTransmitted = transmissionStage?.Completed || 0
  const ongoingTransmissions = transmissionStage?.Ongoing || 0
  const failedTransmissions = summary?.Failed || 0
  const passRate =
    totalTransmitted + failedTransmissions > 0
      ? ((totalTransmitted / (totalTransmitted + failedTransmissions)) * 100).toFixed(1)
      : '100.0'

  // Live scan feed table
  const filteredScans = useMemo(() => {
    const baseScans = tableView === 'wip' ? allBooks.filter((b) => b.isWip) : allBooks
    return baseScans.filter((item) => {
      const matchesSearch =
        !historySearch ||
        item.ISBN?.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.BoxNumber?.toLowerCase().includes(historySearch.toLowerCase())
      if (!matchesSearch) return false
      if (!stageFilter) return true
      const { stage, state } = parseStatus(item.Status || '')
      if (stageFilter.category === 'ALL') {
        return stage === stageFilter.stage
      }
      return stage === stageFilter.stage && state === stageFilter.category
    })
  }, [allBooks, tableView, historySearch, stageFilter])

  const recentScansPagination = usePagination({
    totalItems: filteredScans.length,
    defaultPageSize: isMobile ? 8 : 50,
  })
  const paginatedRecentScans = useMemo(
    () => filteredScans.slice(recentScansPagination.offset, recentScansPagination.offset + recentScansPagination.limit),
    [filteredScans, recentScansPagination.offset, recentScansPagination.limit]
  )

  // Background ILMS enrichment
  useEffect(() => {
    const missingIsbns = paginatedRecentScans
      .filter((item) => (item.BoxNumber === '—' || !item.BoxNumber) && !fetchedIsbns.current.has(item.ISBN))
      .map((item) => item.ISBN)
      .filter(Boolean) as string[]

    if (missingIsbns.length > 0) {
      missingIsbns.forEach((isbn) => fetchedIsbns.current.add(isbn))

      const fetchEnrichment = async () => {
        try {
          const data = await enrichIlms({ isbns: missingIsbns })
          if (data.success && data.enriched) {
            setEnrichedData((prev) => ({ ...prev, ...(data.enriched || {}) }))
          }
        } catch (e) {
          console.error('Failed to enrich ILMS data:', e)
        }
      }
      fetchEnrichment()
    }
  }, [paginatedRecentScans])

  // Reset to page 1 when filters change
  useEffect(() => {
    recentScansPagination.goToPage(1)
  }, [stageFilter, historySearch, recentScansPagination.goToPage])

  return {
    brand,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    fromDateOpenMobile,
    setFromDateOpenMobile,
    fromDateOpenDesktop,
    setFromDateOpenDesktop,
    toDateOpenMobile,
    setToDateOpenMobile,
    toDateOpenDesktop,
    setToDateOpenDesktop,
    newProcessOnly,
    setNewProcessOnly,
    historySearch,
    setHistorySearch,
    historySearchOpen,
    setHistorySearchOpen,
    loading,
    lastUpdated,
    summary,
    stages,
    recentScans,
    allBooks,
    totalBooks,
    wipCount,
    limitReached,
    tableView,
    setTableView,
    stageFilter,
    setStageFilter,
    byMachine,
    enrichedData,
    isManager,
    fetchLiveData,
    showRanking,
    setShowRanking,
    ranking,
    rankingLoading,
    handleOpenRanking,
    exporting,
    handleExport,
    totalTransmitted,
    ongoingTransmissions,
    failedTransmissions,
    passRate,
    filteredScans,
    paginatedRecentScans,
    recentScansPagination,
    formatPipelineStage,
  }
}

export type UseTransmissionReturn = ReturnType<typeof useTransmission>
