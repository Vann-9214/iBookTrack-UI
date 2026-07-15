"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  Tag,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  BookOpen,
  Clock,
  UploadCloud,
} from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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

function getSimflexBadge(status: string | null, completed: boolean) {
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
  const [stageFilter, setStageFilter] = useState<{ stage: string, category: 'COMPLETED' | 'ONGOING' | 'FAILED' } | null>(null)
  const [byMachine, setByMachine] = useState<any[]>([])
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

  // --- LOT visibility state ---
  const [lotInput, setLotInput] = useState("")
  const [lotLoading, setLotLoading] = useState(false)
  const [lotSummary, setLotSummary] = useState<any>(null)
  const [lotError, setLotError] = useState<string | null>(null)
  const [lotIsbnSearch, setLotIsbnSearch] = useState("")
  const [allLots, setAllLots] = useState<any[]>([])
  const [lotsListLoading, setLotsListLoading] = useState(false)
  const [lotExpandedSections, setLotExpandedSections] = useState<Record<string, boolean>>({
    transmitted: false, wip: true, non_processable: false,
  })

  // --- Box visibility state ---
  const [boxInput, setBoxInput] = useState("")
  const [boxLoading, setBoxLoading] = useState(false)
  const [boxData, setBoxData] = useState<any>(null)
  const [boxError, setBoxError] = useState<string | null>(null)
  const [boxIsbnSearch, setBoxIsbnSearch] = useState("")

  // --- ISBN tagging state ---
  const [tagModalScan, setTagModalScan] = useState<any>(null)
  const [tagStatus, setTagStatus] = useState<'reject' | 'non_processable'>('reject')
  const [tagRemarks, setTagRemarks] = useState("")
  const [tagging, setTagging] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)

  // Determine if user is a manager (stored in localStorage)
  const [isManager, setIsManager] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role')
      setIsManager(role === 'manager' || role === 'admin')
    }
  }, [])

  // Pagination for by machine table
  const filteredByMachine = byMachine.filter((m: any) =>
    !machineSearch ||
    m.MachineName?.toLowerCase().includes(machineSearch.toLowerCase()) ||
    m.User?.toLowerCase().includes(machineSearch.toLowerCase()) ||
    m.MachineID?.toLowerCase().includes(machineSearch.toLowerCase())
  )
  const machinesPagination = usePagination({ totalItems: filteredByMachine.length, defaultPageSize: 10 })
  const paginatedByMachine = filteredByMachine.slice(machinesPagination.offset, machinesPagination.offset + machinesPagination.limit)

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

  // --- Fetch all lots for picker ---
  const fetchAllLots = useCallback(async () => {
    setLotsListLoading(true)
    try {
      const res = await authFetch(`${API_URL}/api/lots`)
      const data = await res.json()
      setAllLots(data.lots || [])
    } catch { /* silent */ }
    finally { setLotsListLoading(false) }
  }, [])

  // --- LOT transmission summary fetch ---
  const fetchLotSummary = useCallback(async (defaultQ?: any) => {
    const qStr = typeof defaultQ === 'string' ? defaultQ : ''
    const q = qStr || lotInput.trim() || 'latest'
    setLotLoading(true)
    setLotError(null)
    setLotSummary(null)
    setLotIsbnSearch('')
    try {
      const res = await authFetch(`${API_URL}/api/lots/${encodeURIComponent(q)}/transmission-summary`)
      const data = await res.json()
      if (!data.success) { setLotError(data.error || 'Failed to load LOT data'); return }
      setLotSummary(data)
      setLotInput(data.lot_number)
    } catch (e: any) {
      setLotError(e.message || 'Failed to load LOT data')
    } finally {
      setLotLoading(false)
    }
  }, [lotInput])

  useEffect(() => {
    fetchAllLots()
    fetchLotSummary('latest')
  }, []) // Fetch lot list + latest lot on mount

  // --- Box transmission fetch ---
  const fetchBoxTransmission = async () => {
    const q = boxInput.trim()
    if (!q) return
    setBoxLoading(true)
    setBoxError(null)
    setBoxData(null)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${encodeURIComponent(q)}/transmission`)
      const data = await res.json()
      if (!data.success) { setBoxError(data.error || 'Box not found'); return }
      setBoxData(data)
    } catch (e: any) {
      setBoxError(e.message || 'Failed to load box data')
    } finally {
      setBoxLoading(false)
    }
  }

  // --- ISBN tagging ---
  const handleTagSubmit = async () => {
    if (!tagModalScan) return
    if (!tagRemarks.trim()) { setTagError('Remarks are required'); return }
    setTagging(true)
    setTagError(null)
    try {
      const res = await authFetch(`${API_URL}/api/warehouse/scans/${tagModalScan.scan_id}/tag`, {
        method: 'POST',
        body: JSON.stringify({ status: tagStatus, remarks: tagRemarks.trim() }),
      })
      const data = await res.json()
      if (!data.success) { setTagError(data.error || 'Failed to tag ISBN'); return }
      // Refresh box or lot data after tagging
      if (boxData) fetchBoxTransmission()
      if (lotSummary) fetchLotSummary()
      setTagModalScan(null)
      setTagRemarks("")
    } catch (e: any) {
      setTagError(e.message || 'Failed to tag ISBN')
    } finally {
      setTagging(false)
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
    return stage === stageFilter.stage && state === stageFilter.category
  })

  const recentScansPagination = usePagination({ totalItems: filteredScans.length, defaultPageSize: 10 })
  const paginatedRecentScans = filteredScans.slice(recentScansPagination.offset, recentScansPagination.offset + recentScansPagination.limit)

  // Reset to page 1 when filters change
  useEffect(() => {
    recentScansPagination.goToPage(1)
  }, [stageFilter, historySearch, recentScansPagination.goToPage])

  // LOT isbn filtered list
  const lotIsbns: any[] = lotSummary?.isbns || []
  const filteredLotIsbns = lotIsbns.filter((r: any) =>
    !lotIsbnSearch ||
    r.isbn?.toLowerCase().includes(lotIsbnSearch.toLowerCase()) ||
    r.title?.toLowerCase().includes(lotIsbnSearch.toLowerCase())
  )
  const lotIsbnPagination = usePagination({ totalItems: filteredLotIsbns.length, defaultPageSize: 20 })
  const paginatedLotIsbns = filteredLotIsbns.slice(lotIsbnPagination.offset, lotIsbnPagination.offset + lotIsbnPagination.limit)

  // Box isbn filtered list
  const boxBooks: any[] = boxData?.books || []
  const filteredBoxBooks = boxBooks.filter((b: any) =>
    !boxIsbnSearch ||
    b.isbn?.toLowerCase().includes(boxIsbnSearch.toLowerCase()) ||
    b.title?.toLowerCase().includes(boxIsbnSearch.toLowerCase())
  )
  const boxBookPagination = usePagination({ totalItems: filteredBoxBooks.length, defaultPageSize: 50 })
  const paginatedBoxBooks = filteredBoxBooks.slice(boxBookPagination.offset, boxBookPagination.offset + boxBookPagination.limit)

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
                      <div key={s.Stage} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-2 sm:p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex flex-col gap-1.5 sm:gap-3 relative overflow-hidden">
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
                                onClick={() => setStageFilter(isActive ? null : { stage: s.Stage, category: p.key as any })}
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
                      <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />LOT
                    </TabsTrigger>
                    <TabsTrigger value="box" className="text-xs sm:text-sm px-2 sm:px-3">
                      <Box className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />Box
                    </TabsTrigger>
                    <TabsTrigger value="isbn" className="text-xs sm:text-sm px-2 sm:px-3">
                      <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />ISBN
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-white">
                          <tr className="border-b border-gray-100">
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">ISBN</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Box</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Status</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">User</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr><td colSpan={6} className="text-center py-12">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </td></tr>
                          ) : filteredScans.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-12 text-gray-400">No scans found</td></tr>
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
                                <td className="text-xs text-gray-600 px-4 py-3">{item.BoxNumber || '—'}</td>
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
                    {filteredScans.length > 0 && recentScansPagination.totalPages > 1 && (
                      <Pagination
                        currentPage={recentScansPagination.currentPage}
                        totalPages={recentScansPagination.totalPages}
                        pageSize={recentScansPagination.pageSize}
                        onPageChange={recentScansPagination.goToPage}
                        onPageSizeChange={recentScansPagination.setPageSize}
                        canPrevPage={recentScansPagination.canPrevPage}
                        canNextPage={recentScansPagination.canNextPage}
                        pageSizeOptions={[10]}
                      />
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
                        placeholder="Search machine or user..."
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
                        placeholder="Search machine or user..."
                        value={machineSearch}
                        onChange={(e) => setMachineSearch(e.target.value)}
                        className="h-8 text-sm bg-white w-full"
                      />
                    </div>
                  )}
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead className="bg-white">
                          <tr className="border-b border-gray-100">
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine Name</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine ID</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">User</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left w-48">Activity</th>
                            <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Total Scans</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr><td colSpan={5} className="text-center py-12">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </td></tr>
                          ) : filteredByMachine.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-12 text-gray-400">{byMachine.length === 0 ? 'No machine data for today' : 'No machines match your search'}</td></tr>
                          ) : paginatedByMachine.map((m: any, i: number) => {
                            const maxScans = filteredByMachine[0]?.TotalScans || 1
                            return (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="font-semibold text-xs text-gray-800 px-4 py-3">{m.MachineName}</td>
                                <td className="text-xs text-gray-500 px-4 py-3">{m.MachineID}</td>
                                <td className="text-xs text-gray-700 px-4 py-3">{m.User}</td>
                                <td className="px-4 py-3"><Progress value={(m.TotalScans / maxScans) * 100} className="h-2" /></td>
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
                        pageSizeOptions={[10]}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── LOT Visibility ── */}
              <TabsContent value="lot" className="mt-4">
                <div className="flex flex-col gap-3">

                  {/* ── LOT Picker ── */}
                  <Card className="border-border bg-card py-0 gap-0 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-gradient-to-r from-indigo-50/70 to-white">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">LOT Transmission</p>
                        <p className="text-[11px] text-gray-500">Select a LOT to view book pipeline status</p>
                      </div>
                      {/* Inline manual search */}
                      <div className="flex gap-1.5 shrink-0">
                        <Input
                          placeholder="Search lot…"
                          value={lotInput}
                          onChange={e => setLotInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') fetchLotSummary() }}
                          className="w-36 h-8 text-xs"
                        />
                        <Button size="sm" onClick={fetchLotSummary} disabled={lotLoading || !lotInput.trim()} className="h-8 px-3 gap-1">
                          {lotLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* Lot chips */}
                    <div className="px-5 py-3">
                      {lotsListLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading lots…
                        </div>
                      ) : allLots.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">No lots found</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {allLots.map((lot: any) => {
                            const isActive = lotSummary?.lot_number?.toLowerCase() === lot.lot_number?.toLowerCase()
                            const boxCount = lot.boxes?.[0]?.count ?? lot.total_boxes ?? 0
                            return (
                              <button
                                key={lot.id}
                                onClick={() => { setLotInput(lot.lot_number); fetchLotSummary(lot.lot_number) }}
                                disabled={lotLoading}
                                className={`
                                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                  transition-all duration-150 border cursor-pointer
                                  ${isActive
                                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-200'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                                  }
                                  ${lotLoading ? 'opacity-60 cursor-wait' : ''}
                                `}
                              >
                                <Package className="h-3 w-3" />
                                <span className="font-semibold">{lot.lot_number}</span>
                                <span className={`text-[10px] ${isActive ? 'text-indigo-100' : 'text-gray-400'}`}>
                                  {boxCount} box{boxCount !== 1 ? 'es' : ''}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {lotError && (
                        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" />{lotError}
                        </p>
                      )}
                    </div>
                  </Card>

                  {/* ── Loading state ── */}
                  {lotLoading && !lotSummary && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading lot data…
                    </div>
                  )}

                  {/* ── LOT Summary Dashboard ── */}
                  {lotSummary && (
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
                          {lotSummary.processable > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {((lotSummary.transmitted / lotSummary.processable) * 100).toFixed(0)}% transmitted
                            </p>
                          )}
                        </div>

                        <div className="p-4 space-y-4">
                          {/* ── Stats Row (5 stats, no rejected) ── */}
                          <div className="grid grid-cols-5 gap-2">
                            <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5">
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total</p>
                              <p className="text-xl font-black text-gray-700 leading-tight mt-0.5">{lotSummary.total}</p>
                            </div>
                            <div className="rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2.5">
                              <p className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Processable</p>
                              <p className="text-xl font-black text-blue-600 leading-tight mt-0.5">{lotSummary.processable}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
                              <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Transmitted</p>
                              <p className="text-xl font-black text-emerald-600 leading-tight mt-0.5">{lotSummary.transmitted}</p>
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5">
                              <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">WIP</p>
                              <p className="text-xl font-black text-amber-600 leading-tight mt-0.5">{(lotSummary.processable || 0) - (lotSummary.transmitted || 0)}</p>
                            </div>
                            <div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2.5">
                              <p className="text-[10px] font-medium text-red-400 uppercase tracking-wider">Non-Proc.</p>
                              <p className="text-xl font-black text-red-600 leading-tight mt-0.5">{lotSummary.non_processable}</p>
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

                      {/* ── ISBN Table ── */}
                      <Card className="border-border bg-card overflow-hidden py-0 gap-0">
                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">Books</p>
                            <Badge variant="secondary" className="text-[10px] font-mono">{filteredLotIsbns.length}</Badge>
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
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/40 sticky top-0 z-10">
                                <tr className="border-b border-border">
                                  <th className="text-left font-semibold text-muted-foreground px-4 py-2 w-[140px]">ISBN</th>
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
                                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                                      <BookOpen className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/40" />
                                      No ISBNs found
                                    </td>
                                  </tr>
                                ) : paginatedLotIsbns.map((r: any, i: number) => (
                                  <tr key={r.scan_id || i} className="border-b border-border/40 hover:bg-indigo-50/40 transition-colors group h-[42px]">
                                    <td className="px-4 py-2 align-middle">
                                      <p className="font-mono text-[11px] font-bold text-foreground leading-none">{r.isbn}</p>
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
                                      {getSimflexBadge(r.simflex_status, r.transmission_completed)}
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
                                      {isManager && r.scan_status === 'processable' && (
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                          onClick={() => { setTagModalScan(r); setTagStatus('reject'); setTagRemarks(''); setTagError(null) }}>
                                          Tag
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {filteredLotIsbns.length > 0 && lotIsbnPagination.totalPages > 1 && (
                            <Pagination
                              currentPage={lotIsbnPagination.currentPage}
                              totalPages={lotIsbnPagination.totalPages}
                              pageSize={lotIsbnPagination.pageSize}
                              onPageChange={lotIsbnPagination.goToPage}
                              onPageSizeChange={lotIsbnPagination.setPageSize}
                              canPrevPage={lotIsbnPagination.canPrevPage}
                              canNextPage={lotIsbnPagination.canNextPage}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* ── Box Visibility ── */}
              <TabsContent value="box" className="mt-4">
                <div className="flex flex-col gap-4">
                  <Card className="border-border bg-card py-0 gap-0 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-violet-50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-white shrink-0">
                        <Box className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">Box-Level Transmission</p>
                        <p className="text-xs text-gray-500">Search a box number to view per-ISBN Simflex status and transmission dates</p>
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter Box Number (e.g. Lot-101-PROCESSABLE-0001)"
                          value={boxInput}
                          onChange={e => setBoxInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') fetchBoxTransmission() }}
                          className="max-w-sm text-sm"
                        />
                        <Button onClick={fetchBoxTransmission} disabled={boxLoading || !boxInput.trim()} className="gap-1.5">
                          {boxLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          Search
                        </Button>
                      </div>
                      {boxError && (
                        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" />{boxError}
                        </p>
                      )}
                    </div>
                  </Card>

                  {boxData && (
                    <>
                      {/* Box info + summary */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="flex-1 rounded-xl border border-border bg-card p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 border border-violet-200">
                              <Box className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-foreground">{boxData.box.box_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {boxData.box.lot_number} · <span className="capitalize">{boxData.box.current_stage}</span>
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Total', value: boxData.summary.total, color: 'blue' },
                              { label: 'Transmitted', value: boxData.summary.transmitted, color: 'emerald' },
                              { label: 'WIP', value: boxData.summary.wip, color: 'amber' },
                              { label: 'Non-Processable', value: boxData.summary.non_processable, color: 'red' },
                            ].map(s => (
                              <div key={s.label} className={`rounded-lg border bg-${s.color}-50 border-${s.color}-200 p-2.5`}>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
                                <p className={`text-xl font-black text-${s.color}-600 mt-0.5`}>{s.value}</p>
                              </div>
                            ))}
                          </div>
                          {boxData.summary.total > 0 && (
                            <div className="mt-3">
                              <Progress value={(boxData.summary.transmitted / (boxData.summary.total - boxData.summary.non_processable || 1)) * 100} className="h-2" />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {boxData.summary.transmitted} of {boxData.summary.total - boxData.summary.non_processable} processable books transmitted
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ISBN table */}
                      <Card className="border-border bg-card overflow-hidden py-0 gap-0">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                          <p className="text-sm font-semibold text-foreground">ISBNs in {boxData.box.box_number}</p>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Search ISBN or title..."
                              value={boxIsbnSearch}
                              onChange={e => setBoxIsbnSearch(e.target.value)}
                              className="w-56 pl-9 h-8 text-xs bg-white"
                            />
                          </div>
                        </div>
                        <CardContent className="p-0">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/30 sticky top-0">
                              <tr className="border-b border-border">
                                <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">ISBN</th>
                                <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Title</th>
                                <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Scan Status</th>
                                <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Simflex Status</th>
                                <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Transmission Date</th>
                                <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Scan User</th>
                                <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedBoxBooks.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No books found</td></tr>
                              ) : paginatedBoxBooks.map((b: any, i: number) => (
                                <tr key={b.scan_id || i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                  <td className="font-mono px-4 py-2.5 text-foreground">{b.isbn}</td>
                                  <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[180px]">{b.title || '—'}</td>
                                  <td className="px-4 py-2.5">{getScanStatusBadge(b.scan_status)}</td>
                                  <td className="px-4 py-2.5">{getSimflexBadge(b.simflex_status, b.transmission_completed)}</td>
                                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                    {b.transmission_date ? format(new Date(b.transmission_date), 'MMM d, yyyy HH:mm') : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-muted-foreground">{b.scan_user || '—'}</td>
                                  <td className="px-4 py-2.5">
                                    {isManager && b.scan_status === 'processable' && (
                                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-amber-600 hover:bg-amber-50"
                                        onClick={() => { setTagModalScan(b); setTagStatus('reject'); setTagRemarks(''); setTagError(null) }}>
                                        Tag
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filteredBoxBooks.length > 0 && boxBookPagination.totalPages > 1 && (
                            <Pagination
                              currentPage={boxBookPagination.currentPage}
                              totalPages={boxBookPagination.totalPages}
                              pageSize={boxBookPagination.pageSize}
                              onPageChange={boxBookPagination.goToPage}
                              onPageSizeChange={boxBookPagination.setPageSize}
                              canPrevPage={boxBookPagination.canPrevPage}
                              canNextPage={boxBookPagination.canNextPage}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* ── ISBN Management ── */}
              <TabsContent value="isbn" className="mt-4">
                <Card className="border-border bg-card overflow-hidden py-0 gap-0">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-amber-50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">ISBN Status Management</p>
                      <p className="text-xs text-gray-500">
                        {isManager
                          ? 'Tag individual ISBNs as Rejected or Non-Processable. Use Box Visibility or LOT Visibility tab to find and tag ISBNs.'
                          : 'This feature is restricted to scanning team managers. Use the Box Visibility or LOT Visibility tab to search for ISBNs.'}
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    {!isManager ? (
                      <div className="flex flex-col items-center gap-3 py-12">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 border border-amber-200">
                          <AlertTriangle className="h-7 w-7 text-amber-500" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Manager Access Required</p>
                        <p className="text-xs text-muted-foreground text-center max-w-xs">
                          Only authorized scanning team managers can tag ISBNs. Contact your administrator if you need this access.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <div className="flex items-start gap-3">
                            <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-blue-800">How to tag an ISBN</p>
                              <ol className="mt-1 text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
                                <li>Go to the <strong>Box Visibility</strong> or <strong>LOT Visibility</strong> tab</li>
                                <li>Search for the box or LOT containing the ISBN</li>
                                <li>Click the <strong>Tag</strong> button next to the ISBN you want to update</li>
                                <li>Select the new status (Reject or Non-Processable) and enter remarks</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 p-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Status Definitions</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                              <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 mb-2 text-[10px]">Rejected</Badge>
                              <p className="text-xs text-gray-600">Book was scanned but physically rejected due to quality, damage, or other issues at the scanning stage.</p>
                            </div>
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                              <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 mb-2 text-[10px]">Non-Processable</Badge>
                              <p className="text-xs text-gray-600">Book cannot be processed for digital archiving (e.g. duplicate, out-of-scope, or copyright restriction).</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
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

      {/* ISBN Tag Modal */}
      {tagModalScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTagModalScan(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Tag ISBN</h3>
              <button onClick={() => setTagModalScan(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>

            <div className="mb-4 rounded-lg bg-muted/40 border border-border px-3 py-2.5">
              <p className="text-xs font-semibold text-muted-foreground">ISBN</p>
              <p className="text-sm font-mono font-bold text-foreground">{tagModalScan.isbn}</p>
              {tagModalScan.title && <p className="text-xs text-muted-foreground mt-0.5">{tagModalScan.title}</p>}
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-foreground mb-2">New Status</p>
              <div className="flex gap-2">
                {(['reject', 'non_processable'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setTagStatus(s)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                      tagStatus === s
                        ? s === 'reject'
                          ? 'border-orange-400 bg-orange-100 text-orange-700'
                          : 'border-red-400 bg-red-100 text-red-700'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    {s === 'reject' ? 'Rejected' : 'Non-Processable'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={tagRemarks}
                onChange={e => setTagRemarks(e.target.value)}
                placeholder="Enter reason for tagging this ISBN..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {tagError && <p className="mt-1 text-xs text-red-600">{tagError}</p>}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setTagModalScan(null)} disabled={tagging}>Cancel</Button>
              <Button size="sm" onClick={handleTagSubmit} disabled={tagging || !tagRemarks.trim()}
                className={tagStatus === 'reject' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}>
                {tagging ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirm Tag
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
