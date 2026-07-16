"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { RefreshControl } from "@/components/refresh-control"
import { usePagination } from "@/hooks/usePagination"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authFetch } from "@/lib/auth-api"
import { useBrand } from "@/hooks/use-brand"
import {
  FileUp,
  CheckCircle2,
  XCircle,
  Activity,
  Radio,
  Search,
  Loader2,
  RefreshCw,
  Trophy,
  Download,
  Calendar as CalendarIcon,
  Package,
  Box,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Clock,
  UploadCloud,
  ChevronsUpDown,
  X,
} from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const FLAG_ISSUES = [
  { value: "bleed-through",        label: "Bleed-through on page" },
  { value: "brittle",              label: "Brittle on page" },
  { value: "cannot-detach-sticky", label: "Cannot be detached or sticky pages" },
  { value: "cd-only",              label: "CD only, no text content" },
  { value: "map-spanning",         label: "Contains a map spanning the entire book" },
  { value: "split-pages",          label: "Contains split pages" },
  { value: "cutoff-text",          label: "Cutoff text on page" },
  { value: "illegible-text",       label: "Illegible text" },
  { value: "inverted-contrast",    label: "Inverted contrast: White on black background" },
  { value: "missing-pages",        label: "Missing page/s" },
  { value: "no-content",           label: "No content or body text" },
  { value: "obscured-highlight",   label: "Obscured text due to highlight marker" },
  { value: "obscured-watermark",   label: "Obscured text due to watermarks" },
  { value: "oversized",            label: "Oversized and cannot fit in the scanner" },
  { value: "pen-marks",            label: "Pen marks on page" },
  { value: "pop-up-book",          label: "Pop-up book" },
  { value: "postcard-only",        label: "Postcard only" },
  { value: "stained-dirty",        label: "Stained or dirty page" },
  { value: "stamp-mark",           label: "Stamp mark on page" },
  { value: "thick-cardboard",      label: "Thick or cardboard pages" },
  { value: "torn-pages",           label: "Torn pages" },
]

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

function formatPipelineStage(stage: string) {
  if (!stage) return '—'
  if (stage === 'Tif2PDF') return 'PDF Conversion'
  if (stage === 'Validate') return 'Jaguar Validate'
  return stage.replace(/_/g, ' ')
}

function parseStatus(status: string) {
  const parts = status?.split(' ') || []
  const state = parts.pop()?.toUpperCase() || ''
  const stage = parts.join(' ')
  return { stage, state }
}

function getPipelineStatusBadge(status: string) {
  const parts = status?.split(' ') || []
  const state = parts.pop() || 'ONGOING'
  const stage = parts.join(' ')
  const formattedStage = formatPipelineStage(stage)
  const stateUpper = state.toUpperCase()

  if (stateUpper === 'COMPLETED') return (
    <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-[10px]">
      <CheckCircle2 className="h-3 w-3" /> {formattedStage} COMPLETED
    </Badge>
  )
  if (stateUpper === 'FAILED') return (
    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[10px]">
      <XCircle className="h-3 w-3" /> {formattedStage} FAILED
    </Badge>
  )
  return (
    <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-600 gap-1 text-[10px]">
      <Loader2 className="h-3 w-3 animate-spin" /> {formattedStage} ONGOING
    </Badge>
  ) 
}

function getSimflexBadge(status: string | null, completed: boolean, scanStatus?: string) {
  if (scanStatus === 'non_processable') return (
    <Badge variant="outline" className="border-gray-200 bg-gray-100 text-gray-400 text-[10px]">
      N/A
    </Badge>
  )
  if (completed) return (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 gap-1 text-[10px]">
      <CheckCircle2 className="h-3 w-3" /> Transmitted
    </Badge>
  )
  if (!status) return (
    <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-500 text-[10px]">
      Pending
    </Badge>
  )
  if (status.includes('Validate')) return (
    <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 text-[10px]">Jaguar Validate</Badge>
  )
  if (status.includes('Tif2PDF')) return (
    <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700 text-[10px]">PDFConversion</Badge>
  )
  if (status.includes('Preval')) return (
    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">Pre-Validation</Badge>
  )
  if (status.includes('Scanning')) return (
    <Badge variant="outline" className="border-cyan-300 bg-cyan-50 text-cyan-700 text-[10px]">Done Scan</Badge>
  )
  return (
    <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-500 text-[10px]">{status}</Badge>
  )
}

function getScanStatusBadge(scan_status: string) {
  if (scan_status === 'processable') return (
    <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-[10px]">Processable</Badge>
  )
  if (scan_status === 'non_processable') return (
    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 text-[10px]">Non-Processable</Badge>
  )
  if (scan_status === 'reject') return (
    <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 text-[10px]">Rejected</Badge>
  )
  return (
    <Badge variant="outline" className="border-gray-200 text-[10px]">{scan_status}</Badge>
  )
}

const todayStr = () => new Date().toISOString().split('T')[0]

export default function TransmissionMonitorPage() {
  const { brand } = useBrand()

  // --- Live feed state ---
  const [historySearch, setHistorySearch] = useState("")
  const [historySearchOpen, setHistorySearchOpen] = useState(false)
  const [machineSearch, setMachineSearch] = useState("")
  const [machineSearchOpen, setMachineSearchOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [allBooks, setAllBooks] = useState<any[]>([])
  const [totalBooks, setTotalBooks] = useState(0)
  const [wipCount, setWipCount] = useState(0)
  const [tableView, setTableView] = useState<'books' | 'wip'>('books')
  const [stageFilter, setStageFilter] = useState<{ stage: string, category: 'COMPLETED' | 'ONGOING' | 'FAILED' | 'ALL' } | null>(null)
  const [byMachine, setByMachine] = useState<any[]>([])
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null)
  const [selectedMachineBooks, setSelectedMachineBooks] = useState<any[]>([])
  const [selectedMachineBooksLoading, setSelectedMachineBooksLoading] = useState(false)
  const [selectedMachineBooksError, setSelectedMachineBooksError] = useState<string | null>(null)
  const [showRanking, setShowRanking] = useState(false)
  const [ranking, setRanking] = useState<any>(null)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [fromDate, setFromDate] = useState(todayStr())
  const [toDate, setToDate] = useState(todayStr())
  const [fromDateOpenMobile, setFromDateOpenMobile] = useState(false)
  const [fromDateOpenDesktop, setFromDateOpenDesktop] = useState(false)
  const [toDateOpenMobile, setToDateOpenMobile] = useState(false)
  const [toDateOpenDesktop, setToDateOpenDesktop] = useState(false)
  const [newProcessOnly, setNewProcessOnly] = useState(false)
  const [enrichedData, setEnrichedData] = useState<Record<string, { box: string, lot: string }>>({})
  const fetchedIsbns = useRef<Set<string>>(new Set())

  // --- LOT visibility state ---
  const [lotInput, setLotInput] = useState("")
  const [lotLoading, setLotLoading] = useState(false)
  const [lotSummary, setLotSummary] = useState<any>(null)
  const [lotError, setLotError] = useState<string | null>(null)
  const [lotIsbnFilter, setLotIsbnFilter] = useState<'all'|'processable'|'transmitted'|'wip'|'non_processable'>('all')
  const [lotBoxFilter, setLotBoxFilter] = useState<string>('all')
  const [lotBoxSelectorOpen, setLotBoxSelectorOpen] = useState(false)
  const [lotBoxSearch, setLotBoxSearch] = useState("")
  const [lotIsbnSearch, setLotIsbnSearch] = useState("")
  const [lotSearchResults, setLotSearchResults] = useState<any[]>([])
  const [lotSearchTotal, setLotSearchTotal] = useState(0)
  const [lotSearchPage, setLotSearchPage] = useState(1)
  const [lotSearchPageSize, setLotSearchPageSize] = useState(50)
  const [lotSearchLoading, setLotSearchLoading] = useState(false)
  const [lotSearchQuery, setLotSearchQuery] = useState("")
  const [showLotPicker, setShowLotPicker] = useState(true)
  const lotSearchTimerRef = useRef<any>(null)
  const [lotExpandedSections, setLotExpandedSections] = useState<Record<string, boolean>>({
    transmitted: false, wip: true, non_processable: false,
  })

  // --- ISBN tagging state ---
  const [flagModalScan, setFlagModalScan] = useState<any>(null)
  const [flagIssue, setFlagIssue] = useState('')
  const [flagRemarks, setFlagRemarks] = useState('')
  const [flagging, setFlagging] = useState(false)
  const [flagError, setFlagError] = useState<string | null>(null)
  const [flagOpen, setFlagOpen] = useState(false)

  // Determine if user is a manager (stored in localStorage)
  const [isManager, setIsManager] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role')
      setIsManager(role === 'manager' || role === 'admin')
    }
  }, [])

  // Normalize missing machine names and group duplicates so each row is unique.
  const NONE_MACHINE = '__NONE__'
  const normalizeMachineName = (name: any) => {
    const s = String(name ?? '').trim()
    return s ? s : NONE_MACHINE
  }
  const machineDisplayName = (key: string) => key === NONE_MACHINE ? '—' : key

  const groupedByMachine = useMemo(() => {
    const map = new Map<string, { MachineName: string; TotalScans: number }>()
    for (const m of byMachine) {
      const key = normalizeMachineName(m.MachineName)
      const existing = map.get(key)
      if (existing) {
        existing.TotalScans += Number(m.TotalScans || 0)
      } else {
        map.set(key, { MachineName: key, TotalScans: Number(m.TotalScans || 0) })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.TotalScans - a.TotalScans)
  }, [byMachine])

  // Per-machine transmission completion stats from the distinct books feed.
  const machineBookStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>()
    for (const b of allBooks) {
      const key = normalizeMachineName(b.ScanMachineName)
      const existing = map.get(key) || { total: 0, completed: 0 }
      existing.total += 1
      if (b.Status === 'Transmission_Archive COMPLETED') existing.completed += 1
      map.set(key, existing)
    }
    return map
  }, [allBooks])

  // Pagination for by machine table
  const filteredByMachine = groupedByMachine.filter((m: any) =>
    !machineSearch ||
    machineDisplayName(m.MachineName).toLowerCase().includes(machineSearch.toLowerCase())
  )
  const machinesPagination = usePagination({ totalItems: filteredByMachine.length, defaultPageSize: 10 })
  const paginatedByMachine = filteredByMachine.slice(machinesPagination.offset, machinesPagination.offset + machinesPagination.limit)
  const machineBooksPagination = usePagination({ totalItems: selectedMachineBooks.length, defaultPageSize: 50 })
  const paginatedMachineBooks = selectedMachineBooks.slice(machineBooksPagination.offset, machineBooksPagination.offset + machineBooksPagination.limit)

  const fetchMachineBooks = async (machine: string) => {
    if (selectedMachine === machine) {
      setSelectedMachine(null)
      setSelectedMachineBooks([])
      setSelectedMachineBooksError(null)
      return
    }

    setSelectedMachine(machine)
    setSelectedMachineBooks([])
    setSelectedMachineBooksError(null)
    setSelectedMachineBooksLoading(true)
    machineBooksPagination.goToPage(1)
    try {
      const params = new URLSearchParams({ machine, from: fromDate, to: toDate, location: brand, newProcessOnly: String(newProcessOnly) })
      const res = await authFetch(`${API_URL}/api/scanning/machine-books?${params}`)
      const data = await res.json()
      if (!data.success) { setSelectedMachineBooksError(data.error || 'Failed to load machine books'); return }
      setSelectedMachineBooks(data.books || [])
    } catch (e: any) {
      setSelectedMachineBooksError(e.message || 'Failed to load machine books')
    } finally {
      setSelectedMachineBooksLoading(false)
    }
  }

  const fetchLiveData = useCallback(async (from?: string, to?: string) => {
    setLoading(true)
    try {
      const f = from || fromDate
      const t = to || toDate
      const res = await authFetch(`${API_URL}/api/scanning/live?from=${f}&to=${t}&location=${brand}&newProcessOnly=${newProcessOnly}`)
      const data = await res.json()
      if (data.success) {
        setSummary(data.summary)
        setStages(data.byStage || [])
        setRecentScans(data.recentScans || [])
        setAllBooks(data.allBooks || [])
        setTotalBooks(data.totalBooks || 0)
        setWipCount(data.wipCount || 0)
        setByMachine(data.byMachine || [])
        setLastUpdated(new Date())
      }
    } catch (e) {
      console.error('Failed to fetch live scanning data:', e)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, brand, newProcessOnly])

  const fetchRanking = async () => {
    setRankingLoading(true)
    try {
      const res = await authFetch(`${API_URL}/api/scanning/ranking?location=${brand}`)
      const data = await res.json()
      if (data.success) setRanking(data)
    } catch (e) {
      console.error('Failed to fetch ranking:', e)
    } finally {
      setRankingLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await authFetch(`${API_URL}/api/scanning/export?date=${fromDate}&location=${brand}`)
      const blob = await res.blob()
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
  }

  const handleOpenRanking = () => {
    setShowRanking(true)
    fetchRanking()
  }



  useEffect(() => {
    fetchLiveData()
  }, [fetchLiveData])

  useEffect(() => {
    setSelectedMachine(null)
    setSelectedMachineBooks([])
    setSelectedMachineBooksError(null)
  }, [fromDate, toDate, brand, newProcessOnly])

  const lotTypeForBrand = (b: string) => b === 'jaguar' ? 'Jaguar' : 'Mustang'

  // --- Search lots with server-side pagination ---
  const searchLots = useCallback(async (query: string, page = 1, pageSize = 50) => {
    setLotSearchLoading(true)
    try {
      const offset = (page - 1) * pageSize
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset), type: lotTypeForBrand(brand) })
      if (query.trim()) params.set('search', query.trim())
      const res = await authFetch(`${API_URL}/api/lots?${params}`)
      const data = await res.json()
      setLotSearchResults(data.lots || [])
      setLotSearchTotal(data.total || 0)
      setLotSearchQuery(query)
      setLotSearchPage(page)
      setLotSearchPageSize(pageSize)
    } catch { /* silent */ }
    finally { setLotSearchLoading(false) }
  }, [brand])

  // Debounced lot search
  const handleLotSearchChange = useCallback((value: string) => {
    setLotSearchQuery(value)
    if (lotSearchTimerRef.current) clearTimeout(lotSearchTimerRef.current)
    lotSearchTimerRef.current = setTimeout(() => {
      searchLots(value, 1, lotSearchPageSize) // reset to page 1 on new search
    }, 300)
  }, [searchLots, lotSearchPageSize])

  // --- LOT transmission summary fetch ---
  const fetchLotSummary = useCallback(async (defaultQ?: any) => {
    const qStr = typeof defaultQ === 'string' ? defaultQ : ''
    const q = qStr || lotInput.trim()
    if (!q) return
    setLotLoading(true)
    setLotError(null)
    setLotSummary(null)
    setLotIsbnSearch('')
    setLotIsbnFilter('all')
    setLotBoxFilter('all')
    setLotBoxSearch('')
    try {
      const params = new URLSearchParams({ type: lotTypeForBrand(brand) })
      const res = await authFetch(`${API_URL}/api/lots/${encodeURIComponent(q)}/transmission-summary?${params}`)
      const data = await res.json()
      if (!data.success) { setLotError(data.error || 'Failed to load LOT data'); return }
      setLotSummary(data)
      setLotInput(data.lot_number)
      setShowLotPicker(false)
    } catch (e: any) {
      setLotError(e.message || 'Failed to load LOT data')
    } finally {
      setLotLoading(false)
    }
  }, [lotInput, brand])

  // Load initial lot list on mount (empty search = most recent)
  useEffect(() => {
    searchLots('', 1, 50)
  }, [searchLots])

  // ── Flag logic ─────────────────────────────────────────────────────────────
  const handleFlagSubmit = async () => {
    if (!flagModalScan) return
    if (!flagIssue) {
      setFlagError('Please select a rejection reason.')
      return
    }

    try {
      setFlagging(true)
      setFlagError(null)
      const res = await authFetch(`${API_URL}/api/warehouse/scans/${flagModalScan.scan_id}/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'non_processable',
          remarks: `${flagIssue}: ${flagRemarks}`
        })
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to flag ISBN')
      }

      setFlagModalScan(null)
      // Refresh lot data after tagging
      if (lotSummary) fetchLotSummary()
      setFlagIssue('')
      setFlagRemarks('')
    } catch (err: any) {
      setFlagError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setFlagging(false)
    }
  }

  const transmissionStage = stages.find(s => s.Stage === 'Transmission_Archive')
  const totalTransmitted = transmissionStage?.Completed || 0
  const ongoingTransmissions = transmissionStage?.Ongoing || 0
  const failedTransmissions = summary?.Failed || 0
  const passRate = totalTransmitted + failedTransmissions > 0
    ? ((totalTransmitted / (totalTransmitted + failedTransmissions)) * 100).toFixed(1)
    : '100.0'

  // Live scan feed table — use allBooks (deduped, IsRework=0) filtered by tableView toggle
  const baseScans = tableView === 'wip'
    ? allBooks.filter((b: any) => b.isWip)
    : allBooks

  const filteredScans = baseScans.filter((item: any) => {
    const matchesSearch = !historySearch ||
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

  const recentScansPagination = usePagination({ totalItems: filteredScans.length, defaultPageSize: 50 })
  const paginatedRecentScans = filteredScans.slice(recentScansPagination.offset, recentScansPagination.offset + recentScansPagination.limit)

  // Background fetch ILMS for visible books
  useEffect(() => {
    const missingIsbns = paginatedRecentScans
      .filter((item: any) => (item.BoxNumber === '—' || !item.BoxNumber) && !fetchedIsbns.current.has(item.ISBN))
      .map((item: any) => item.ISBN)
      .filter(Boolean)

    if (missingIsbns.length > 0) {
      missingIsbns.forEach((isbn: string) => fetchedIsbns.current.add(isbn))
      
      const fetchEnrichment = async () => {
        try {
          const res = await authFetch(`${API_URL}/api/scanning/enrich-ilms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isbns: missingIsbns })
          })
          const data = await res.json()
          if (data.success && data.enriched) {
            setEnrichedData(prev => ({ ...prev, ...data.enriched }))
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

  // LOT isbn filtered list
  const lotIsbns: any[] = lotSummary?.isbns || []
  // Boxes contained in the active LOT, derived from its ISBN rows
  const lotBoxGroups: any[] = (() => {
    const map = new Map<string, any>()
    for (const r of lotIsbns) {
      const key = r.box_number || '—'
      if (!map.has(key)) {
        map.set(key, { box_number: key, total: 0, processable: 0, transmitted: 0, non_processable: 0 })
      }
      const g = map.get(key)
      g.total++
      if (r.scan_status === 'processable') g.processable++
      if (r.scan_status === 'non_processable') g.non_processable++
      if (r.transmission_completed) g.transmitted++
    }
    return Array.from(map.values()).sort((a, b) =>
      a.box_number.localeCompare(b.box_number, undefined, { numeric: true, sensitivity: 'base' })
    )
  })()

  // Scalable box selector: search + cap rendered rows so lots with thousands of boxes stay fast
  const BOX_RENDER_CAP = 100
  const lotBoxSearchLower = lotBoxSearch.trim().toLowerCase()
  const matchedBoxGroups = lotBoxSearchLower
    ? lotBoxGroups.filter((g: any) => g.box_number.toLowerCase().includes(lotBoxSearchLower))
    : lotBoxGroups
  const visibleBoxGroups = matchedBoxGroups.slice(0, BOX_RENDER_CAP)
  const activeBoxGroup = lotBoxFilter !== 'all' ? lotBoxGroups.find((g: any) => g.box_number === lotBoxFilter) : null

  const filteredLotIsbns = lotIsbns.filter((r: any) => {
    const matchesSearch = !lotIsbnSearch ||
      r.isbn?.toLowerCase().includes(lotIsbnSearch.toLowerCase()) ||
      r.title?.toLowerCase().includes(lotIsbnSearch.toLowerCase())
    if (!matchesSearch) return false;

    if (lotBoxFilter !== 'all' && (r.box_number || '—') !== lotBoxFilter) return false;

    if (lotIsbnFilter === 'processable') return r.scan_status === 'processable';
    if (lotIsbnFilter === 'transmitted') return r.transmission_completed;
    if (lotIsbnFilter === 'wip') return r.scan_status === 'processable' && !r.transmission_completed;
    if (lotIsbnFilter === 'non_processable') return r.scan_status === 'non_processable';
    return true;
  })
  const lotIsbnPagination = usePagination({ totalItems: filteredLotIsbns.length, defaultPageSize: 50 })
  const paginatedLotIsbns = filteredLotIsbns.slice(lotIsbnPagination.offset, lotIsbnPagination.offset + lotIsbnPagination.limit)

  // Reset LOT book list to page 1 when its filters change
  useEffect(() => {
    lotIsbnPagination.goToPage(1)
  }, [lotBoxFilter, lotIsbnFilter, lotIsbnSearch, lotIsbnPagination.goToPage])

  const lastUpdateLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
    : 'Not updated yet'



  return (
    <div className={cn("flex h-dvh overflow-hidden bg-background", `theme-${brand}`)}>
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                  <Radio className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                    Transmission Monitor
                  </h1>
                  <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    Live scanning data from Simflex WMS for <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-white", brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500')}>{brand}</span>
                  </p>
                </div>
              </div>
              {/* Mobile layout: left col = From/To, right col = icons + checkbox */}
              <div className="flex gap-3 sm:hidden justify-between">
                {/* Left: From + To stacked — own Popover instances for mobile */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground w-7 shrink-0">From</span>
                    <Popover open={fromDateOpenMobile} onOpenChange={setFromDateOpenMobile} modal>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {fromDate ? format(new Date(fromDate), 'MMM dd, yyyy') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                        <Calendar mode="single" selected={fromDate ? new Date(fromDate) : undefined}
                          onSelect={date => { setFromDate(date ? format(date, 'yyyy-MM-dd') : ''); setFromDateOpenMobile(false) }} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground w-7 shrink-0">To</span>
                    <Popover open={toDateOpenMobile} onOpenChange={setToDateOpenMobile} modal>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {toDate ? format(new Date(toDate), 'MMM dd, yyyy') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                        <Calendar mode="single" selected={toDate ? new Date(toDate) : undefined}
                          onSelect={date => { setToDate(date ? format(date, 'yyyy-MM-dd') : ''); setToDateOpenMobile(false) }} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {/* Right: Export + Ranking icons on top, checkbox below */}
                <div className="flex flex-col gap-1.5 items-end justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="h-8 w-8 p-0">
                      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleOpenRanking} className="h-8 w-8 p-0">
                      <Trophy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newProcessOnly}
                      onChange={e => setNewProcessOnly(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-primary cursor-pointer"
                    />
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">New Process Only</span>
                  </label>
                </div>
              </div>

              {/* Desktop layout: all inline — own Popover instances for desktop */}
              <div className="hidden sm:flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Popover open={fromDateOpenDesktop} onOpenChange={setFromDateOpenDesktop}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {fromDate ? format(new Date(fromDate), 'MMM dd, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={fromDate ? new Date(fromDate) : undefined}
                        onSelect={date => { setFromDate(date ? format(date, 'yyyy-MM-dd') : ''); setFromDateOpenDesktop(false) }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Popover open={toDateOpenDesktop} onOpenChange={setToDateOpenDesktop}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {toDate ? format(new Date(toDate), 'MMM dd, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={toDate ? new Date(toDate) : undefined}
                        onSelect={date => { setToDate(date ? format(date, 'yyyy-MM-dd') : ''); setToDateOpenDesktop(false) }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newProcessOnly}
                    onChange={e => setNewProcessOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">New Process Only</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
                    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenRanking} className="gap-1.5">
                    <Trophy className="h-3.5 w-3.5" /> Ranking
                  </Button>
                  <RefreshControl onRefresh={() => fetchLiveData()} refreshing={loading} lastUpdated={lastUpdated} storageKey="transmission" className="hidden sm:flex" />
                </div>
              </div>
            </header>

            {/* Metric Cards — compact 3-col on mobile, full cards on desktop */}
            {/* Mobile */}
            <div className="grid grid-cols-3 gap-2 sm:hidden">
              <div className="rounded-2xl border border-blue-300 bg-blue-100/60 p-2.5 flex flex-col items-center justify-center shadow-sm active:scale-[0.97] transition-all text-center">
                <div className="text-lg font-black leading-none text-blue-600">{loading ? '…' : totalTransmitted.toLocaleString()}</div>
                <div className="text-[10px] font-medium text-gray-500 mt-0.5 leading-tight">Transmitted</div>
              </div>
              <div className="rounded-2xl border border-green-300 bg-green-100/60 p-2.5 flex flex-col items-center justify-center shadow-sm active:scale-[0.97] transition-all text-center">
                <div className="text-lg font-black leading-none text-green-600">{loading ? '…' : `${passRate}%`}</div>
                <div className="text-[10px] font-medium text-gray-500 mt-0.5 leading-tight">Pass</div>
              </div>
              <div className="rounded-2xl border border-teal-300 bg-teal-100/60 p-2.5 flex flex-col items-center justify-center shadow-sm active:scale-[0.97] transition-all text-center">
                <div className="text-lg font-black leading-none text-teal-600">{loading ? '…' : (summary?.TotalScans || 0).toLocaleString()}</div>
                <div className="text-[10px] font-medium text-gray-500 mt-0.5 leading-tight">Total</div>
              </div>
            </div>
            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-blue-300 bg-blue-100/60 hover:bg-blue-100 p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-sm">
                    <FileUp className="h-6 w-6" />
                  </div>
                  {ongoingTransmissions > 0 && (
                    <span className="text-[11px] font-semibold text-blue-600">{ongoingTransmissions} in progress</span>
                  )}
                </div>
                <div className="text-3xl font-black text-blue-600 mb-0.5">{loading ? '…' : totalTransmitted.toLocaleString()}</div>
                <div className="text-sm font-semibold text-gray-700 mb-0.5">Transmitted Today</div>
                <div className="text-xs text-blue-500">books sent to archive</div>
              </div>
              <div className="rounded-2xl border border-green-300 bg-green-100/60 hover:bg-green-100 p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 text-white shadow-sm">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  {failedTransmissions > 0 && (
                    <span className="text-[11px] font-semibold text-red-500">{failedTransmissions} failed</span>
                  )}
                </div>
                <div className="text-3xl font-black text-green-600 mb-0.5">{loading ? '…' : `${passRate}%`}</div>
                <div className="text-sm font-semibold text-gray-700 mb-0.5">Pass Rate</div>
                <div className="text-xs text-green-500">transmission success rate</div>
              </div>
              <div className="rounded-2xl border border-teal-300 bg-teal-100/60 hover:bg-teal-100 p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-sm">
                    <Activity className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">{summary?.Ongoing || 0} ongoing</span>
                </div>
                <div className="text-3xl font-black text-teal-600 mb-0.5">{loading ? '…' : (summary?.TotalScans || 0).toLocaleString()}</div>
                <div className="text-sm font-semibold text-gray-700 mb-0.5">Total Books Today</div>
                <div className="text-xs text-teal-500">all successful scans this session</div>
              </div>
            </div>

            {/* Stage breakdown — fixed order matches legacy tool */}
            {(() => {
              const STAGE_ORDER = ['Scanning', 'Jaguar Validate', 'Tif2PDF', 'Preval', 'Transmission_Archive']
              const stageMap = Object.fromEntries(stages.map((s: any) => [s.Stage, s]))
              const ordered = [
                ...STAGE_ORDER.map(n => stageMap[n] || { Stage: n, Total: 0, Completed: 0, Ongoing: 0, Failed: 0 }),
                ...stages.filter((s: any) => !STAGE_ORDER.includes(s.Stage) && s.Stage !== 'QA' && s.Stage !== 'Validate'),
              ]
              return (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {ordered.map((s: any) => {
                    const pct = s.Total > 0 ? (s.Completed / s.Total) * 100 : 0
                    return (
                      <div 
                        key={s.Stage} 
                        onClick={() => setStageFilter(stageFilter?.stage === s.Stage && stageFilter?.category === 'ALL' ? null : { stage: s.Stage, category: 'ALL' })}
                        className={cn("cursor-pointer rounded-2xl border bg-white shadow-sm p-2 sm:p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex flex-col gap-1.5 sm:gap-3 relative overflow-hidden text-left",
                          stageFilter?.stage === s.Stage && stageFilter?.category === 'ALL' ? 'border-indigo-400 ring-2 ring-indigo-400/20' : 'border-gray-200'
                        )}
                      >
                        {s.Total > 0 && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />}
                        {/* Stage name + total */}
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[9px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wide leading-tight break-words">{formatPipelineStage(s.Stage)}</p>
                          <span className="text-base sm:text-xl font-black text-gray-800 leading-none shrink-0">{s.Total.toLocaleString()}</span>
                        </div>

                        {/* Progress bar */}
                        <Progress value={pct} className="h-1.5" />

                        {/* Stat pills */}
                        <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
                          {[
                            { key: 'COMPLETED', label: 'DONE', smLabel: 'COMPLETED', count: s.Completed, bg: 'bg-green-50', border: 'border-green-100', hover: 'hover:bg-green-100', ring: 'ring-green-400', text: 'text-green-500', num: 'text-green-700' },
                            { key: 'ONGOING', label: 'ON', smLabel: 'ONGOING', count: s.Ongoing, bg: 'bg-blue-50', border: 'border-blue-100', hover: 'hover:bg-blue-100', ring: 'ring-blue-400', text: 'text-blue-400', num: 'text-blue-600' },
                            { key: 'FAILED', label: 'FAIL', smLabel: 'FAILED', count: s.Failed, bg: 'bg-red-50', border: 'border-red-100', hover: 'hover:bg-red-100', ring: 'ring-red-400', text: 'text-red-400', num: 'text-red-600' },
                          ].map((p) => {
                            const isActive = stageFilter?.stage === s.Stage && stageFilter?.category === p.key
                            return (
                                <button
                                  key={p.key}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setStageFilter(isActive ? null : { stage: s.Stage, category: p.key as any })
                                  }}
                                className={cn(
                                  'flex flex-col items-center rounded-lg border px-0.5 py-1 sm:px-1.5 sm:py-1.5 transition-colors focus:outline-none',
                                  p.bg, p.border, p.hover,
                                  isActive && `ring-2 ${p.ring} bg-opacity-100`
                                )}
                              >
                                <span className={cn('font-semibold uppercase tracking-wide leading-none mb-0.5 text-[7px] sm:text-[10px]', p.text)}>
                                  <span className="sm:hidden">{p.label}</span>
                                  <span className="hidden sm:inline">{p.smLabel}</span>
                                </span>
                                <span className={cn('font-black leading-none text-[11px] sm:text-sm', p.num)}>{p.count}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* Tabs */}
            <Tabs defaultValue="queue" className="w-full">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="overflow-x-auto w-full sm:w-auto">
                  <TabsList className="flex w-max min-w-full sm:min-w-0 sm:w-auto">
                    <TabsTrigger value="queue" className="text-xs sm:text-sm px-2 sm:px-3">Live Scan Feed</TabsTrigger>
                    <TabsTrigger value="machine" className="text-xs sm:text-sm px-2 sm:px-3">By Machine</TabsTrigger>
                    <TabsTrigger value="lot" className="text-xs sm:text-sm px-2 sm:px-3">
                      <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />LOT &amp; Box
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Books / WIP toggle */}
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 p-0.5">
                  <button
                    onClick={() => setTableView('books')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
                      tableView === 'books'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', tableView === 'books' ? (brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500') : 'bg-gray-400')} />
                    {loading ? '…' : totalBooks} Books
                  </button>
                  <button
                    onClick={() => setTableView('wip')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
                      tableView === 'wip'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', tableView === 'wip' ? 'bg-red-500' : 'bg-gray-400')} />
                    {loading ? '…' : wipCount} WIP
                  </button>
                </div>
              </div>

              {/* ── Live Scan Feed ── */}
              <TabsContent value="queue" className="mt-4">
                <Card className="border-border bg-card overflow-hidden py-0 gap-0">
                  <div className={cn("flex items-center justify-between px-5 py-4 border-b", brand === 'jaguar' ? "bg-green-50 border-green-100" : "bg-blue-50 border-blue-100")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-white", brand === 'jaguar' ? "bg-green-500" : "bg-blue-500")}>
                        <FileUp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {tableView === 'wip' ? 'Work In Progress' : 'All Books'}
                          <span className="hidden sm:inline"> — {fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', tableView === 'wip' ? 'bg-red-500' : (brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500'))} />
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {tableView === 'wip'
                              ? <><span className="sm:hidden">{filteredScans.length} not transmitted</span><span className="hidden sm:inline">{filteredScans.length} books not yet transmitted</span></>
                              : `${filteredScans.length} books total`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stageFilter && (
                        <button
                          onClick={() => setStageFilter(null)}
                          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <span className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            stageFilter.category === 'COMPLETED' && 'bg-green-500',
                            stageFilter.category === 'ONGOING' && 'bg-blue-500',
                            stageFilter.category === 'FAILED' && 'bg-red-500'
                          )} />
                          {formatPipelineStage(stageFilter.stage)} {stageFilter.category.toLowerCase()}
                          <XCircle className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      )}
                      {/* Desktop search */}
                      <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search ISBN or box..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="w-56 pl-9 h-8 text-sm bg-white"
                        />
                      </div>
                      {/* Mobile search icon */}
                      <button
                        className="sm:hidden flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                        onClick={() => setHistorySearchOpen(v => !v)}
                        aria-label="Search"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* Mobile search dropdown */}
                  {historySearchOpen && (
                    <div className="sm:hidden px-4 py-2 border-b border-blue-100 bg-blue-50/60">
                      <Input
                        autoFocus
                        placeholder="Search ISBN or box..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="h-8 text-sm bg-white w-full"
                      />
                    </div>
                  )}
                  <CardContent className="p-0">
                    <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-white sticky top-0 z-10">
                          <tr className="border-b border-gray-100">
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">ISBN</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Box</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Lot</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Status</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">User</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr><td colSpan={7} className="text-center py-12">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </td></tr>
                          ) : filteredScans.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-12 text-gray-400">No scans found</td></tr>
                          ) : paginatedRecentScans.map((item: any, i: number) => {
                            const isOngoing = item.Status?.includes('ONGOING')
                            const isWip = item.isWip
                            const rowCls = isOngoing
                              ? tableView === 'wip'
                                ? 'border-b border-red-100 bg-red-50/60 hover:bg-red-50'
                                : 'border-b border-blue-100 bg-blue-50/50 hover:bg-blue-50'
                              : 'border-b border-gray-50 hover:bg-gray-50'
                            return (
                              <tr key={i} className={`${rowCls} transition-colors`}>
                                <td className="font-mono text-xs text-gray-800 px-4 py-3">{item.ISBN}</td>
                                <td className="text-xs text-gray-600 px-4 py-3">{(enrichedData[item.ISBN]?.box && enrichedData[item.ISBN]?.box !== '—') ? enrichedData[item.ISBN].box : (item.BoxNumber || '—')}</td>
                                <td className="text-xs text-gray-600 px-4 py-3">{(enrichedData[item.ISBN]?.lot && enrichedData[item.ISBN]?.lot !== '—') ? enrichedData[item.ISBN].lot : (item.LotNumber || '—')}</td>
                                <td className="px-4 py-3">{getPipelineStatusBadge(item.Status || '')}</td>
                                <td className="text-xs text-gray-500 px-4 py-3">{item.ScanMachineName || item.MachineName || '—'}</td>
                                <td className="text-xs text-gray-600 px-4 py-3">{item.ScanUser || '—'}</td>
                                <td className="text-xs text-gray-400 px-4 py-3 text-right whitespace-nowrap">
                                  {item.Updated ? format(new Date(item.Updated), 'MMM d, HH:mm') : item.ScanDate ? format(new Date(item.ScanDate), 'MMM d') : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {filteredScans.length > 0 && (
                      <div className="w-full border-t border-border bg-muted/10 p-2 text-muted-foreground">
                        <Pagination
                          currentPage={recentScansPagination.currentPage}
                          totalPages={recentScansPagination.totalPages}
                          pageSize={recentScansPagination.pageSize}
                          onPageChange={recentScansPagination.goToPage}
                          onPageSizeChange={recentScansPagination.setPageSize}
                          canPrevPage={recentScansPagination.canPrevPage}
                          canNextPage={recentScansPagination.canNextPage}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── By Machine ── */}
              <TabsContent value="machine" className="mt-4">
                <Card className="border-border bg-card overflow-hidden py-0 gap-0">
                  <div className="flex items-center justify-between px-5 py-4 bg-teal-50 border-b border-teal-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          Scans by Machine
                          <span className="hidden sm:inline"> — {fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                          <span className="text-xs text-gray-500">Per machine output</span>
                        </div>
                      </div>
                    </div>
                    {/* Desktop search */}
                    <div className="relative hidden sm:block">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search machine..."
                        value={machineSearch}
                        onChange={(e) => setMachineSearch(e.target.value)}
                        className="w-56 pl-9 h-8 text-sm bg-white"
                      />
                    </div>
                    {/* Mobile search icon */}
                    <button
                      className="sm:hidden flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                      onClick={() => setMachineSearchOpen(v => !v)}
                      aria-label="Search"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Mobile search dropdown */}
                  {machineSearchOpen && (
                    <div className="sm:hidden px-4 py-2 border-b border-teal-100 bg-teal-50/60">
                      <Input
                        autoFocus
                        placeholder="Search machine..."
                        value={machineSearch}
                        onChange={(e) => setMachineSearch(e.target.value)}
                        className="h-8 text-sm bg-white w-full"
                      />
                    </div>
                  )}
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead className="bg-white">
                          <tr className="border-b border-gray-100">
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine Name</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left w-48">Activity</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Total Scans</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr><td colSpan={3} className="text-center py-12">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </td></tr>
                          ) : filteredByMachine.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-12 text-gray-400">{byMachine.length === 0 ? 'No machine data for today' : 'No machines match your search'}</td></tr>
                          ) : paginatedByMachine.map((m: any, i: number) => {
                            const stats = machineBookStats.get(m.MachineName) || { total: 0, completed: 0 }
                            const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
                            const isSelected = selectedMachine === m.MachineName
                            return (
                              <tr
                                key={i}
                                className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-teal-50 hover:bg-teal-100' : 'hover:bg-gray-50'}`}
                                onClick={() => fetchMachineBooks(m.MachineName)}
                              >
                                <td className="font-semibold text-xs text-gray-800 px-4 py-3">{machineDisplayName(m.MachineName)}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <Progress value={pct} className="h-2 flex-1" />
                                    <span className="text-xs font-semibold text-gray-500 w-9 text-right">{pct}%</span>
                                  </div>
                                </td>
                                <td className="text-xs font-bold text-right text-gray-800 px-4 py-3">{m.TotalScans.toLocaleString()}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {filteredByMachine.length > 0 && machinesPagination.totalPages > 1 && (
                      <Pagination
                        currentPage={machinesPagination.currentPage}
                        totalPages={machinesPagination.totalPages}
                        pageSize={machinesPagination.pageSize}
                        onPageChange={machinesPagination.goToPage}
                        onPageSizeChange={machinesPagination.setPageSize}
                        canPrevPage={machinesPagination.canPrevPage}
                        canNextPage={machinesPagination.canNextPage}
                      />
                    )}
                  </CardContent>
                </Card>

                {selectedMachine && (
                  <Card className="border-border bg-card overflow-hidden py-0 gap-0 mt-4">
                    <div className="flex items-center justify-between px-5 py-3 bg-teal-50 border-b border-teal-100">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Books scanned on {machineDisplayName(selectedMachine)}</p>
                        <p className="text-xs text-gray-500">ISBNs reported by Simflex for the selected date range</p>
                      </div>
                      <Badge variant="outline" className="border-teal-200 bg-white text-teal-700 text-xs">
                        {selectedMachineBooks.length} book{selectedMachineBooks.length === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    <CardContent className="p-0">
                      {selectedMachineBooksLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : selectedMachineBooksError ? (
                        <p className="px-5 py-8 text-center text-sm text-destructive">{selectedMachineBooksError}</p>
                      ) : (
                        <>
                          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead className="bg-white sticky top-0 z-10">
                                <tr className="border-b border-gray-100">
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">ISBN</th>
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Status</th>
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">User</th>
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedMachineBooks.length === 0 ? (
                                  <tr><td colSpan={4} className="text-center py-12 text-gray-400">No books found for this machine</td></tr>
                                ) : paginatedMachineBooks.map((book: any) => (
                                  <tr key={book.ISBN} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="font-mono text-xs text-gray-800 px-4 py-3">{book.ISBN}</td>
                                    <td className="px-4 py-3">{getPipelineStatusBadge(book.Status || '')}</td>
                                    <td className="text-xs text-gray-600 px-4 py-3">{book.ScanUser || '—'}</td>
                                    <td className="text-xs text-gray-400 px-4 py-3 text-right whitespace-nowrap">
                                      {book.Updated ? format(new Date(book.Updated), 'MMM d, HH:mm') : book.ScanDate ? format(new Date(book.ScanDate), 'MMM d') : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {selectedMachineBooks.length > 0 && (
                            <Pagination
                              currentPage={machineBooksPagination.currentPage}
                              totalPages={machineBooksPagination.totalPages}
                              pageSize={machineBooksPagination.pageSize}
                              onPageChange={machineBooksPagination.goToPage}
                              onPageSizeChange={machineBooksPagination.setPageSize}
                              canPrevPage={machineBooksPagination.canPrevPage}
                              canNextPage={machineBooksPagination.canNextPage}
                            />
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── LOT Visibility ── */}
              <TabsContent value="lot" className="mt-4">
                <div className="flex flex-col gap-3">

                  {/* ── LOT Selector ── */}
                  {(showLotPicker || !lotSummary) && (
                    <Card className="border-border bg-card py-0 gap-0 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-gradient-to-r from-indigo-50/70 to-white">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white shrink-0">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800">LOT Transmission</p>
                          <p className="text-[11px] text-gray-500">
                            Search and select a LOT to view its book pipeline
                            {lotSearchTotal > 0 && <span className="text-gray-400"> · {lotSearchTotal.toLocaleString()} lot{lotSearchTotal !== 1 ? 's' : ''} total</span>}
                          </p>
                        </div>
                      </div>

                      {/* Search bar */}
                      <div className="px-5 py-3 border-b border-border/50 bg-muted/20">
                        <div className="relative max-w-md">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search by lot number… (e.g. lot-3A)"
                            value={lotSearchQuery}
                            onChange={e => handleLotSearchChange(e.target.value)}
                            className="pl-10 h-9 text-sm bg-white"
                            autoFocus
                          />
                          {lotSearchLoading && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Results list */}
                      <div className="max-h-[360px] overflow-y-auto">
                        {lotSearchResults.length === 0 && !lotSearchLoading ? (
                          <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                              <Package className="h-6 w-6 text-indigo-400" />
                            </div>
                            {lotSearchQuery ? (
                              <>
                                <p className="text-sm font-medium text-gray-600">No lots matching "{lotSearchQuery}"</p>
                                <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-600">No lots available</p>
                                <p className="text-xs text-muted-foreground mt-1">Lots will appear here once created</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="bg-muted/30 sticky top-0 z-10">
                              <tr className="border-b border-border">
                                <th className="text-left font-semibold text-muted-foreground px-5 py-2">Lot</th>
                                <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[80px]">Boxes</th>
                                <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[100px]">Type</th>
                                <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[130px]">Created</th>
                                <th className="w-[80px]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lotSearchResults.map((lot: any) => {
                                const isActive = lotSummary?.lot_number?.toLowerCase() === lot.lot_number?.toLowerCase()
                                const boxCount = lot.boxes?.[0]?.count ?? lot.total_boxes ?? 0
                                return (
                                  <tr
                                    key={lot.id}
                                    className={`border-b border-border/40 transition-colors cursor-pointer ${
                                      isActive
                                        ? 'bg-indigo-50/70'
                                        : 'hover:bg-indigo-50/30'
                                    }`}
                                    onClick={() => { setLotInput(lot.lot_number); fetchLotSummary(lot.lot_number) }}
                                  >
                                    <td className="px-5 py-2.5">
                                      <div className="flex items-center gap-2">
                                        {isActive && <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
                                        <span className={`font-semibold ${isActive ? 'text-indigo-700' : 'text-foreground'}`}>
                                          {lot.lot_number}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-muted-foreground">
                                      {boxCount}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <Badge variant="outline" className="text-[10px]">{lot.type || '—'}</Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                                      {lot.created_at ? format(new Date(lot.created_at), 'MMM d, yyyy') : '—'}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] px-2 text-indigo-600 hover:bg-indigo-100"
                                        onClick={(e) => { e.stopPropagation(); setLotInput(lot.lot_number); fetchLotSummary(lot.lot_number) }}
                                      >
                                        View →
                                      </Button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Load more / pagination footer */}
                      {lotSearchTotal > 0 && (
                        <div className="border-t border-border bg-muted/10 p-2 text-muted-foreground flex justify-center">
                          {(() => {
                            const totalPages = Math.ceil(lotSearchTotal / lotSearchPageSize) || 1
                            return (
                              <Pagination
                                currentPage={lotSearchPage}
                                totalPages={totalPages}
                                pageSize={lotSearchPageSize}
                                onPageChange={(page) => searchLots(lotSearchQuery, page, lotSearchPageSize)}
                                onPageSizeChange={(size) => searchLots(lotSearchQuery, 1, size)}
                                canPrevPage={lotSearchPage > 1}
                                canNextPage={lotSearchPage < totalPages}
                              />
                            )
                          })()}
                        </div>
                      )}

                      {lotError && (
                        <div className="px-5 py-2 border-t border-border">
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" />{lotError}
                          </p>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* ── Loading state ── */}
                  {lotLoading && !lotSummary && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading lot data…
                    </div>
                  )}

                  {/* ── LOT Summary Dashboard ── */}
                  {lotSummary && !showLotPicker && (
                    <>
                      {/* ── Analytics Card ── */}
                      <Card className="border-border bg-card py-0 gap-0 overflow-hidden">
                        {/* Lot header */}
                        <div className="px-5 py-3 border-b border-border bg-gradient-to-r from-indigo-50/80 to-white flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <p className="text-sm font-bold text-gray-800 tracking-tight">
                              {lotSummary.lot_number}
                            </p>
                            <Badge variant="outline" className="text-[10px] border-indigo-200 bg-indigo-50 text-indigo-600 font-semibold">
                              {lotSummary.total} {lotSummary.total === 1 ? 'book' : 'books'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            {lotSummary.processable > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {((lotSummary.transmitted / lotSummary.processable) * 100).toFixed(0)}% transmitted
                              </p>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5 gap-1 text-muted-foreground"
                              onClick={() => setShowLotPicker(true)}
                            >
                              <ChevronDown className="h-3 w-3" />
                              Change LOT
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {/* ── Stats Row (5 stats) ── */}
                          <div className="grid grid-cols-5 gap-2">
                            <div 
                              className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${lotIsbnFilter === 'all' ? 'border-gray-400 bg-gray-100 shadow-sm' : 'border-gray-200 bg-gray-50/80 hover:bg-gray-100'}`}
                              onClick={() => setLotIsbnFilter('all')}
                            >
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total</p>
                              <p className="text-xl font-black text-gray-700 leading-tight mt-0.5">{lotSummary.total}</p>
                            </div>
                            <div 
                              className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${lotIsbnFilter === 'processable' ? 'border-blue-400 bg-blue-100 shadow-sm' : 'border-blue-200 bg-blue-50/80 hover:bg-blue-100'}`}
                              onClick={() => setLotIsbnFilter('processable')}
                            >
                              <p className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Processable</p>
                              <p className="text-xl font-black text-blue-600 leading-tight mt-0.5">{lotSummary.processable}</p>
                            </div>
                            <div 
                              className={`rounded-lg border px-2 py-2.5 cursor-pointer transition-colors ${lotIsbnFilter === 'non_processable' ? 'border-red-400 bg-red-100 shadow-sm' : 'border-red-200 bg-red-50/80 hover:bg-red-100'}`}
                              onClick={() => setLotIsbnFilter('non_processable')}
                            >
                              <p className="text-[9px] xl:text-[10px] font-medium text-red-400 uppercase tracking-tight">Non-Processable</p>
                              <p className="text-xl font-black text-red-600 leading-tight mt-0.5">{lotSummary.non_processable}</p>
                            </div>
                            <div 
                              className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${lotIsbnFilter === 'transmitted' ? 'border-emerald-400 bg-emerald-100 shadow-sm' : 'border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100'}`}
                              onClick={() => setLotIsbnFilter('transmitted')}
                            >
                              <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Transmitted</p>
                              <p className="text-xl font-black text-emerald-600 leading-tight mt-0.5">{lotSummary.transmitted}</p>
                            </div>
                            <div 
                              className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${lotIsbnFilter === 'wip' ? 'border-amber-400 bg-amber-100 shadow-sm' : 'border-amber-200 bg-amber-50/80 hover:bg-amber-100'}`}
                              onClick={() => setLotIsbnFilter('wip')}
                            >
                              <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">WIP</p>
                              <p className="text-xl font-black text-amber-600 leading-tight mt-0.5">{(lotSummary.processable || 0) - (lotSummary.transmitted || 0)}</p>
                            </div>
                          </div>

                          {/* ── Transmission Progress ── */}
                          {lotSummary.processable > 0 && (
                            <div className="px-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[11px] font-semibold text-gray-500">Transmission Progress</p>
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  <span className="text-emerald-600 font-bold">{lotSummary.transmitted}</span>
                                  <span className="text-gray-400"> / </span>
                                  <span>{lotSummary.processable}</span>
                                </p>
                              </div>
                              <Progress value={(lotSummary.transmitted / lotSummary.processable) * 100} className="h-2" />
                            </div>
                          )}

                          {/* ── WIP Pipeline Breakdown ── */}
                          {lotSummary.wip && ((lotSummary.wip.done_scan + lotSummary.wip.pre_validation + lotSummary.wip.pdf_conversion + lotSummary.wip.validation) > 0) && (
                            <div className="flex items-center gap-1.5 px-1">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">WIP Pipeline</p>
                              {[
                                { label: 'Scan', value: lotSummary.wip.done_scan, color: 'cyan' },
                                { label: 'Pre-Val', value: lotSummary.wip.pre_validation, color: 'amber' },
                                { label: 'PDF', value: lotSummary.wip.pdf_conversion, color: 'violet' },
                                { label: 'Validate', value: lotSummary.wip.validation, color: 'blue' },
                              ].map(s => (
                                <Badge key={s.label} variant="outline" className={`text-[10px] gap-1 border-${s.color}-200 bg-${s.color}-50 text-${s.color}-700`}>
                                  {s.label}: <span className="font-black">{s.value}</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* ── Box Filter (scalable, searchable) ── */}
                      {lotBoxGroups.length > 0 && (
                        <Card className="border-border bg-card py-0 gap-0 overflow-hidden">
                          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-2">
                            {/* Label */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-white">
                                <Boxes className="h-4 w-4" />
                              </div>
                              <p className="text-sm font-bold text-gray-800">Filter by Box</p>
                              <Badge variant="outline" className="text-[10px] border-violet-200 bg-violet-50 text-violet-600 font-semibold">
                                {lotBoxGroups.length.toLocaleString()} {lotBoxGroups.length === 1 ? 'box' : 'boxes'}
                              </Badge>
                            </div>

                            {/* Searchable combobox */}
                            <div className="flex flex-1 items-center gap-2 min-w-0">
                              <Popover open={lotBoxSelectorOpen} onOpenChange={(o) => { setLotBoxSelectorOpen(o); if (!o) setLotBoxSearch('') }}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={lotBoxSelectorOpen}
                                    className={cn(
                                      'h-9 w-full sm:w-[260px] min-w-0 justify-between gap-2 bg-white text-foreground font-normal hover:bg-violet-50 hover:text-violet-700 data-[state=open]:border-violet-400 data-[state=open]:ring-2 data-[state=open]:ring-violet-200',
                                      lotBoxFilter !== 'all' && 'border-violet-300 ring-1 ring-violet-200'
                                    )}
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      <Box className={cn('h-4 w-4 shrink-0', lotBoxFilter !== 'all' ? 'text-violet-600' : 'text-muted-foreground')} />
                                      <span className={cn('truncate', lotBoxFilter === 'all' && 'text-muted-foreground')}>
                                        {lotBoxFilter === 'all' ? 'All boxes' : lotBoxFilter}
                                      </span>
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[min(88vw,300px)] p-0" align="start" sideOffset={4}>
                                  {/* Search */}
                                  <div className="relative border-b border-border p-2">
                                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      autoFocus
                                      placeholder={`Search ${lotBoxGroups.length.toLocaleString()} boxes…`}
                                      value={lotBoxSearch}
                                      onChange={(e) => setLotBoxSearch(e.target.value)}
                                      className="h-9 pl-9 text-sm border-0 shadow-none focus-visible:ring-0"
                                    />
                                  </div>
                                  {/* List */}
                                  <div className="max-h-[320px] overflow-y-auto p-1">
                                    {/* All boxes option */}
                                    {!lotBoxSearchLower && (
                                      <button
                                        onClick={() => { setLotBoxFilter('all'); setLotBoxSelectorOpen(false); setLotBoxSearch('') }}
                                        className={cn(
                                          'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                                          lotBoxFilter === 'all' ? 'bg-violet-50 text-violet-700' : 'hover:bg-violet-50 hover:text-violet-700'
                                        )}
                                      >
                                        <Package className="h-4 w-4 shrink-0 text-violet-500" />
                                        <span className="flex-1 font-semibold">All boxes</span>
                                        <span className="text-[11px] text-muted-foreground">{lotIsbns.length.toLocaleString()} books</span>
                                        {lotBoxFilter === 'all' && <Check className="h-4 w-4 text-violet-600 shrink-0" />}
                                      </button>
                                    )}

                                    {matchedBoxGroups.length === 0 ? (
                                      <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                                        <Box className="h-6 w-6 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">No boxes match “{lotBoxSearch}”</p>
                                      </div>
                                    ) : visibleBoxGroups.map((g: any) => {
                                      const isActive = lotBoxFilter === g.box_number
                                      const pct = g.processable > 0 ? Math.round((g.transmitted / g.processable) * 100) : (g.non_processable === g.total ? 100 : 0)
                                      return (
                                        <button
                                          key={g.box_number}
                                          onClick={() => { setLotBoxFilter(g.box_number); setLotBoxSelectorOpen(false); setLotBoxSearch('') }}
                                          className={cn(
                                            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                                            isActive ? 'bg-violet-50' : 'hover:bg-violet-50'
                                          )}
                                        >
                                          <Box className={cn('h-4 w-4 shrink-0', isActive ? 'text-violet-600' : 'text-muted-foreground')} />
                                          <div className="flex min-w-0 flex-1 flex-col">
                                            <span className={cn('truncate font-mono text-[12px] font-semibold', isActive ? 'text-violet-700' : 'text-foreground')}>{g.box_number}</span>
                                            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                              <span>{g.total} books</span>
                                              <span className="text-emerald-600">· {g.transmitted} sent</span>
                                              {g.non_processable > 0 && <span className="text-red-500">· {g.non_processable} N/P</span>}
                                            </span>
                                          </div>
                                          {g.processable > 0 && (
                                            <Badge variant="outline" className={cn('text-[9px] px-1 py-0 font-semibold shrink-0', pct === 100 ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-amber-200 bg-amber-50 text-amber-600')}>
                                              {pct}%
                                            </Badge>
                                          )}
                                          {isActive && <Check className="h-4 w-4 text-violet-600 shrink-0" />}
                                        </button>
                                      )
                                    })}
                                  </div>
                                  {/* Overflow hint */}
                                  {matchedBoxGroups.length > BOX_RENDER_CAP && (
                                    <div className="border-t border-border bg-muted/20 px-3 py-2 text-center text-[11px] text-muted-foreground">
                                      Showing {BOX_RENDER_CAP} of {matchedBoxGroups.length.toLocaleString()} boxes — type to refine
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>

                              {lotBoxFilter !== 'all' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 shrink-0 gap-1 px-2.5 text-xs text-violet-600 hover:bg-violet-100"
                                  onClick={() => setLotBoxFilter('all')}
                                >
                                  <XCircle className="h-3.5 w-3.5" /> Clear
                                </Button>
                              )}
                            </div>

                            {/* Selected box stat pills */}
                            {activeBoxGroup && (
                              <div className="flex shrink-0 items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] border-gray-200 bg-gray-50 text-gray-600 font-semibold gap-1">
                                  {activeBoxGroup.total} <span className="font-normal text-muted-foreground">books</span>
                                </Badge>
                                <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-600 font-semibold gap-1">
                                  {activeBoxGroup.transmitted} <span className="font-normal">sent</span>
                                </Badge>
                                {activeBoxGroup.non_processable > 0 && (
                                  <Badge variant="outline" className="text-[10px] border-red-200 bg-red-50 text-red-600 font-semibold gap-1">
                                    {activeBoxGroup.non_processable} <span className="font-normal">N/P</span>
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </Card>
                      )}

                      {/* ── ISBN Table ── */}
                      <Card className="border-border bg-card overflow-hidden py-0 gap-0">
                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">Books</p>
                            <Badge variant="secondary" className="text-[10px] font-mono">{filteredLotIsbns.length}</Badge>
                            {lotBoxFilter !== 'all' && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-violet-200 bg-violet-50 text-violet-700 font-semibold">
                                <Box className="h-2.5 w-2.5" />{lotBoxFilter}
                              </Badge>
                            )}
                          </div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Filter ISBN or title…"
                              value={lotIsbnSearch}
                              onChange={e => setLotIsbnSearch(e.target.value)}
                              className="w-52 pl-9 h-8 text-xs bg-white"
                            />
                          </div>
                        </div>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/40 sticky top-0 z-10">
                                <tr className="border-b border-border">
                                  <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[140px]">ISBN</th>
                                  <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[80px]">Box</th>
                                  <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[100px]">Stage</th>
                                  <th className="text-left font-semibold text-muted-foreground px-4 py-2">Title</th>
                                  <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[110px]">Scan</th>
                                  <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[110px]">Simflex</th>
                                  <th className="text-left font-semibold text-muted-foreground px-3 py-2 w-[150px]">Transmitted</th>
                                  <th className="text-center font-semibold text-muted-foreground px-3 py-2 w-[60px]"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedLotIsbns.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="text-center py-10 text-muted-foreground">
                                      <BookOpen className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/40" />
                                      No books found{lotBoxFilter !== 'all' ? ` in box ${lotBoxFilter}` : ''}
                                    </td>
                                  </tr>
                                ) : paginatedLotIsbns.map((r: any, i: number) => (
                                  <tr key={r.scan_id || i} className="border-b border-border/40 hover:bg-indigo-50/40 transition-colors group h-[42px]">
                                    <td className="px-4 py-2 align-middle">
                                      <p className="font-mono text-[11px] font-bold text-foreground leading-none">{r.isbn}</p>
                                    </td>
                                    <td className="px-4 py-2 align-middle">
                                      <p className="font-mono text-[11px] font-semibold text-gray-500 leading-none">{r.box_number || '—'}</p>
                                    </td>
                                    <td className="px-4 py-2 align-middle">
                                      <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider text-slate-500 border-slate-200 bg-slate-50">{r.current_stage || 'N/A'}</Badge>
                                    </td>
                                    <td className="px-4 py-2 align-middle">
                                      <p className="text-foreground truncate max-w-[300px] leading-tight" title={r.title || '—'}>{r.title || '—'}</p>
                                      {r.rejection_reason && (
                                        <p className="text-[10px] text-red-600 mt-0.5 truncate max-w-[300px]" title={r.rejection_reason}>
                                          ⚠ {r.rejection_reason}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      {getScanStatusBadge(r.scan_status)}
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      {getSimflexBadge(r.simflex_status, r.transmission_completed, r.scan_status)}
                                    </td>
                                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                                      {r.transmission_completed ? (
                                        <div className="flex items-center gap-1.5">
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                          <span className="text-emerald-700 font-medium">
                                            {r.transmission_date ? format(new Date(r.transmission_date), 'MMM d, yyyy HH:mm') : '—'}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      {r.scan_status === 'processable' && (
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-red-600 hover:bg-red-700 hover:text-white transition-colors"
                                          onClick={() => { setFlagModalScan(r); setFlagIssue(''); setFlagRemarks(''); setFlagError(null); setFlagOpen(false) }}>
                                          Flag
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {filteredLotIsbns.length > 0 && (
                            <div className="w-full border-t border-border bg-muted/10 p-2 text-muted-foreground">
                              <Pagination
                                currentPage={lotIsbnPagination.currentPage}
                                totalPages={lotIsbnPagination.totalPages}
                                pageSize={lotIsbnPagination.pageSize}
                                onPageChange={lotIsbnPagination.goToPage}
                                onPageSizeChange={lotIsbnPagination.setPageSize}
                                canPrevPage={lotIsbnPagination.canPrevPage}
                                canNextPage={lotIsbnPagination.canNextPage}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Ranking Modal */}
      {showRanking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowRanking(false)}>
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '90vw', maxWidth: 1100, height: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 bg-amber-50 border-b border-amber-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Performance Ranking</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
              <button onClick={() => setShowRanking(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-amber-200 text-gray-600 hover:bg-amber-100 hover:text-gray-900 transition-all font-semibold text-sm">✕</button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col p-6 gap-5">
              {rankingLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : ranking ? (
                <div className="flex flex-col gap-4 overflow-hidden">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Books</p>
                      <p className="text-3xl font-black text-blue-600 mt-1">{ranking.totalBooks.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Pages</p>
                      <p className="text-3xl font-black text-green-600 mt-1">{ranking.totalPages.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Highest Output</p>
                      <p className="text-3xl font-black text-amber-600 mt-1">{ranking.highestOutput}</p>
                    </div>
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg Output</p>
                      <p className="text-3xl font-black text-teal-600 mt-1">{ranking.avgOutput}</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-white">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b border-gray-100">
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left w-12">Rank</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left">Scan User</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left w-64">Performance</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-right">Books</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-right">Pages</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.data.map((r: any) => (
                          <tr key={r.Rank} className={cn(
                            "border-b border-gray-50 transition-colors",
                            r.Rank === 1 ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"
                          )}>
                            <td className="px-5 py-3">
                              <span className={cn("text-sm font-black",
                                r.Rank === 1 ? "text-amber-500" : r.Rank === 2 ? "text-gray-400" : r.Rank === 3 ? "text-orange-400" : "text-gray-500"
                              )}>{r.Rank === 1 ? '🥇' : r.Rank === 2 ? '🥈' : r.Rank === 3 ? '🥉' : `#${r.Rank}`}</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="font-semibold text-gray-800 text-sm">{r.ScanUser}</span>
                            </td>
                            <td className="px-5 py-3">
                              <Progress value={r.ScoreNum} className="h-2.5" />
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-gray-800">{r.Books.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right text-gray-500">{r.Pages.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">{r.Score}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16 text-gray-400">No ranking data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ISBN Flag Modal */}
      {flagModalScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setFlagModalScan(null)}>
          <div className="bg-card border border-border shadow-2xl w-full max-w-md mx-4 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Flag as Non-Processable</h3>
                  <p className="text-[11px] text-muted-foreground">Mark this book with a rejection reason</p>
                </div>
              </div>
              <button
                onClick={() => setFlagModalScan(null)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Book Info */}
            <div className="px-5 py-3 bg-muted/30 border-b border-border">
              <div className="flex items-start gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{flagModalScan.title}</p>
                  <p className="text-sm font-bold tracking-wider text-foreground font-mono mt-1">ISBN: {flagModalScan.isbn}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">Rejection Reason <span className="text-destructive">*</span></label>
                <Popover open={flagOpen} onOpenChange={setFlagOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={flagOpen}
                      className="w-full justify-between font-normal text-sm h-9 hover:bg-muted/50 hover:text-foreground"
                    >
                      <span className={flagIssue ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
                        {flagIssue ? FLAG_ISSUES.find(i => i.value === flagIssue)?.label : 'Select rejection reason...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                      <CommandInput placeholder="Search issue..." />
                      <CommandList className="max-h-48">
                        <CommandEmpty>No issue found.</CommandEmpty>
                        <CommandGroup>
                          {FLAG_ISSUES.map(i => (
                            <CommandItem
                              key={i.value}
                              value={i.label}
                              onSelect={() => { setFlagIssue(i.value); setFlagOpen(false) }}
                              className="flex justify-between items-center w-full"
                            >
                              <span>{i.label}</span>
                              <Check className={cn('h-4 w-4 text-white', flagIssue === i.value ? 'opacity-100' : 'opacity-0')} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Remarks / Page No.</label>
                <textarea
                  value={flagRemarks}
                  onChange={e => setFlagRemarks(e.target.value)}
                  placeholder="e.g. Page 42, bottom margin"
                  rows={2}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              {flagError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{flagError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setFlagModalScan(null)} disabled={flagging}>Cancel</Button>
              <Button size="sm" onClick={handleFlagSubmit} disabled={flagging || !flagIssue} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {flagging ? 'Saving...' : 'Confirm Flag'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
