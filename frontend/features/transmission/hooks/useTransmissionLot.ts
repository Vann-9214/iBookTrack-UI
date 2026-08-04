'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePagination } from '@/hooks/usePagination'
import {
  fetchLotTransmissionSummary,
  flagScan,
  searchLots,
} from '../services/transmission.service'
import type {
  BoxGroup,
  LotIsbn,
  LotIsbnFilter,
  LotSearchResult,
  LotSummary,
  TransmissionBrand,
} from '../types/transmission.types'
import { lotTypeForBrand } from '../utils/transmission.helpers'

export function useTransmissionLot(brand: TransmissionBrand) {
  const lotType = lotTypeForBrand(brand)

  // Lot visibility state
  const [lotInput, setLotInput] = useState('')
  const [lotLoading, setLotLoading] = useState(false)
  const [lotSummary, setLotSummary] = useState<LotSummary | null>(null)
  const [lotError, setLotError] = useState<string | null>(null)

  const [lotIsbnFilter, setLotIsbnFilter] = useState<LotIsbnFilter>('all')
  const [lotBoxFilter, setLotBoxFilter] = useState<string>('all')
  const [lotStageFilter, setLotStageFilter] = useState<string>('all')
  const [lotTransmissionFilter, setLotTransmissionFilter] = useState<'all' | 'transmitted' | 'not_transmitted'>('all')
  const [lotBoxSelectorOpen, setLotBoxSelectorOpen] = useState(false)
  const [lotBoxSearch, setLotBoxSearch] = useState('')
  const [lotIsbnSearch, setLotIsbnSearch] = useState('')

  const [lotSearchResults, setLotSearchResults] = useState<LotSearchResult[]>([])
  const [lotSearchTotal, setLotSearchTotal] = useState(0)
  const [lotSearchPage, setLotSearchPage] = useState(1)
  const [lotSearchPageSize, setLotSearchPageSize] = useState(50)
  const [lotSearchLoading, setLotSearchLoading] = useState(false)
  const [lotSearchQuery, setLotSearchQuery] = useState('')
  const [showLotPicker, setShowLotPicker] = useState(true)
  const lotSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [lotExpandedSections, setLotExpandedSections] = useState<Record<string, boolean>>({
    transmitted: false,
    wip: true,
    non_processable: false,
  })

  // Reset lot state when brand changes so the user starts back at the picker.
  useEffect(() => {
    setLotInput('')
    setLotSummary(null)
    setLotError(null)
    setShowLotPicker(true)
    setLotIsbnFilter('all')
    setLotBoxFilter('all')
    setLotStageFilter('all')
    setLotTransmissionFilter('all')
    setLotBoxSearch('')
    setLotIsbnSearch('')
    setLotBoxSelectorOpen(false)
    if (lotSearchTimerRef.current) clearTimeout(lotSearchTimerRef.current)
  }, [brand])

  // ISBN tagging state
  const [flagModalScan, setFlagModalScan] = useState<LotIsbn | null>(null)
  const [flagIssue, setFlagIssue] = useState('')
  const [flagRemarks, setFlagRemarks] = useState('')
  const [flagging, setFlagging] = useState(false)
  const [flagError, setFlagError] = useState<string | null>(null)
  const [flagOpen, setFlagOpen] = useState(false)

  const searchLotsCallback = useCallback(
    async (query: string, page = 1, pageSize = 50) => {
      setLotSearchLoading(true)
      try {
        const data = await searchLots({ query, page, pageSize, type: lotType })
        setLotSearchResults(data.lots || [])
        setLotSearchTotal(data.total || 0)
        setLotSearchQuery(query)
        setLotSearchPage(page)
        setLotSearchPageSize(pageSize)
      } catch {
        /* silent */
      } finally {
        setLotSearchLoading(false)
      }
    },
    [lotType]
  )

  const handleLotSearchChange = useCallback(
    (value: string) => {
      setLotSearchQuery(value)
      if (lotSearchTimerRef.current) clearTimeout(lotSearchTimerRef.current)
      lotSearchTimerRef.current = setTimeout(() => {
        searchLotsCallback(value, 1, lotSearchPageSize)
      }, 300)
    },
    [searchLotsCallback, lotSearchPageSize]
  )

  const fetchLotSummary = useCallback(
    async (defaultQ?: string) => {
      const q = defaultQ || lotInput.trim()
      if (!q) return
      setLotLoading(true)
      setLotError(null)
      setLotSummary(null)
      setLotIsbnSearch('')
      setLotIsbnFilter('all')
      setLotBoxFilter('all')
      setLotBoxSearch('')
      try {
        const data = await fetchLotTransmissionSummary({ lotNumber: q, type: lotType })
        if (!data.success) {
          setLotError(data.error || 'Failed to load LOT data')
          return
        }
        setLotSummary(data)
        setLotInput(data.lot_number)
        setShowLotPicker(false)
      } catch (e: unknown) {
        setLotError(e instanceof Error ? e.message : 'Failed to load LOT data')
      } finally {
        setLotLoading(false)
      }
    },
    [lotInput, lotType]
  )

  useEffect(() => {
    searchLotsCallback('', 1, 50)
  }, [searchLotsCallback])

  const handleFlagSubmit = useCallback(async () => {
    if (!flagModalScan) return
    if (!flagIssue) {
      setFlagError('Please select a rejection reason.')
      return
    }

    try {
      setFlagging(true)
      setFlagError(null)
      await flagScan({
        scanId: flagModalScan.scan_id || '',
        issue: flagIssue,
        remarks: flagRemarks,
      })

      setFlagModalScan(null)
      if (lotSummary) fetchLotSummary()
      setFlagIssue('')
      setFlagRemarks('')
    } catch (err: unknown) {
      setFlagError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setFlagging(false)
    }
  }, [flagModalScan, flagIssue, flagRemarks, lotSummary, fetchLotSummary])

  // LOT ISBN filtered list
  const lotIsbns: LotIsbn[] = lotSummary?.isbns || []

  const lotBoxGroups: BoxGroup[] = useMemo(() => {
    const map = new Map<string, BoxGroup>()
    for (const r of lotIsbns) {
      const key = r.box_number || '—'
      if (!map.has(key)) {
        map.set(key, {
          box_number: key,
          total: 0,
          processable: 0,
          transmitted: 0,
          non_processable: 0,
        })
      }
      const g = map.get(key)!
      g.total++
      if (r.scan_status === 'processable') g.processable++
      if (r.scan_status === 'non_processable') g.non_processable++
      if (r.transmission_completed) g.transmitted++
    }
    return Array.from(map.values()).sort((a, b) =>
      a.box_number.localeCompare(b.box_number, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [lotIsbns])

  // Scalable box selector
  const BOX_RENDER_CAP = 100
  const lotBoxSearchLower = lotBoxSearch.trim().toLowerCase()
  const matchedBoxGroups = lotBoxSearchLower
    ? lotBoxGroups.filter((g) => g.box_number.toLowerCase().includes(lotBoxSearchLower))
    : lotBoxGroups
  const visibleBoxGroups = matchedBoxGroups.slice(0, BOX_RENDER_CAP)
  const activeBoxGroup = lotBoxFilter !== 'all' ? lotBoxGroups.find((g) => g.box_number === lotBoxFilter) : null

  // Unique stages present in this lot for the stage filter dropdown.
  const lotStages = useMemo(() => {
    const stages = new Set<string>()
    for (const r of lotIsbns) {
      if (r.current_stage) stages.add(r.current_stage)
    }
    return Array.from(stages).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  }, [lotIsbns])

  const filteredLotIsbns = useMemo(() => {
    return lotIsbns.filter((r) => {
      const matchesSearch =
        !lotIsbnSearch ||
        r.isbn?.toLowerCase().includes(lotIsbnSearch.toLowerCase()) ||
        r.title?.toLowerCase().includes(lotIsbnSearch.toLowerCase())
      if (!matchesSearch) return false

      if (lotBoxFilter !== 'all' && (r.box_number || '—') !== lotBoxFilter) return false

      if (lotStageFilter !== 'all' && r.current_stage !== lotStageFilter) return false

      if (lotTransmissionFilter === 'transmitted') {
        if (!r.transmission_completed) return false
      } else if (lotTransmissionFilter === 'not_transmitted') {
        if (r.transmission_completed) return false
      }

      if (lotIsbnFilter === 'processable') return r.scan_status === 'processable'
      if (lotIsbnFilter === 'transmitted') return r.transmission_completed
      if (lotIsbnFilter === 'wip') return r.scan_status === 'processable' && !r.transmission_completed
      if (lotIsbnFilter === 'non_processable') return r.scan_status === 'non_processable'
      return true
    })
  }, [lotIsbns, lotIsbnSearch, lotBoxFilter, lotIsbnFilter, lotStageFilter, lotTransmissionFilter])

  const isMobile = useIsMobile()
  const lotIsbnPagination = usePagination({
    totalItems: filteredLotIsbns.length,
    defaultPageSize: isMobile ? 10 : 50,
  })
  const paginatedLotIsbns = useMemo(
    () => filteredLotIsbns.slice(lotIsbnPagination.offset, lotIsbnPagination.offset + lotIsbnPagination.limit),
    [filteredLotIsbns, lotIsbnPagination.offset, lotIsbnPagination.limit]
  )

  useEffect(() => {
    lotIsbnPagination.goToPage(1)
  }, [lotBoxFilter, lotIsbnFilter, lotIsbnSearch, lotStageFilter, lotTransmissionFilter, lotIsbnPagination.goToPage])

  return {
    lotInput,
    setLotInput,
    lotLoading,
    lotSummary,
    lotError,
    lotIsbnFilter,
    setLotIsbnFilter,
    lotBoxFilter,
    setLotBoxFilter,
    lotStageFilter,
    setLotStageFilter,
    lotTransmissionFilter,
    setLotTransmissionFilter,
    lotStages,
    lotBoxSelectorOpen,
    setLotBoxSelectorOpen,
    lotBoxSearch,
    setLotBoxSearch,
    lotIsbnSearch,
    setLotIsbnSearch,
    lotSearchResults,
    lotSearchTotal,
    lotSearchPage,
    lotSearchPageSize,
    lotSearchLoading,
    lotSearchQuery,
    setLotSearchQuery,
    showLotPicker,
    setShowLotPicker,
    lotSearchTimerRef,
    lotExpandedSections,
    setLotExpandedSections,
    searchLots: searchLotsCallback,
    handleLotSearchChange,
    fetchLotSummary,
    flagModalScan,
    setFlagModalScan,
    flagIssue,
    setFlagIssue,
    flagRemarks,
    setFlagRemarks,
    flagging,
    flagError,
    setFlagError,
    flagOpen,
    setFlagOpen,
    handleFlagSubmit,
    lotType,
    lotIsbns,
    lotBoxGroups,
    matchedBoxGroups,
    visibleBoxGroups,
    activeBoxGroup,
    BOX_RENDER_CAP,
    filteredLotIsbns,
    paginatedLotIsbns,
    lotIsbnPagination,
  }
}

export type UseTransmissionLotReturn = ReturnType<typeof useTransmissionLot>
