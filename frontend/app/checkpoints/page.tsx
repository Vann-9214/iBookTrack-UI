"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch } from "@/lib/auth-api"
import { useBrand } from "@/hooks/use-brand"
import { DashboardNavbar } from "@/components/top-bar"
import { toast } from "sonner"
import { usePagination } from "@/hooks/usePagination"
import { Pagination } from "@/components/pagination"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Scan, Package, Scissors, CheckCircle, Camera,
  Shield, Radio, Warehouse, ArrowRight, RefreshCw, ChevronRight, ChevronDown, Search, X, Calendar as CalendarIcon,
  Loader2, Zap,
} from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const todayStr = () => new Date().toISOString().split('T')[0]

const STAGE_ORDER = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage'] as const
type Stage = typeof STAGE_ORDER[number]

const STAGE_META: Record<Stage, { label: string; icon: React.ElementType; color: string }> = {
  warehouse:   { label: 'Warehouse',   icon: Package,     color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  inventory:   { label: 'Inventory',   icon: Warehouse,   color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  cut:         { label: 'Cut',         icon: Scissors,    color: 'bg-orange-100 text-orange-700 border-orange-300' },
  endorsement: { label: 'Endorsement', icon: CheckCircle, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  scan:        { label: 'Scan',        icon: Camera,      color: 'bg-blue-100 text-blue-700 border-blue-300' },
  transmit:    { label: 'Transmit',    icon: Radio,       color: 'bg-violet-100 text-violet-700 border-violet-300' },
  storage:     { label: 'Storage',     icon: Warehouse,   color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
}

const statusConfig = {
  active: {
    nodeRing: "border-blue-400 text-blue-500",
    countColor: "text-blue-500",
    bar: "bg-blue-400",
    cardBg: "bg-blue-50",
    dot: "bg-blue-400",
    label: "Active",
  },
  busy: {
    nodeRing: "border-orange-400 text-orange-500",
    countColor: "text-orange-500",
    bar: "bg-orange-400",
    cardBg: "bg-orange-50",
    dot: "bg-orange-400",
    label: "Busy",
  },
  idle: {
    nodeRing: "border-gray-300 text-gray-400",
    countColor: "text-gray-400",
    bar: "bg-gray-400",
    cardBg: "bg-gray-50",
    dot: "bg-gray-400",
    label: "Idle",
  },
  completed: {
    nodeRing: "border-green-300 text-green-400",
    countColor: "text-green-400",
    bar: "bg-green-400",
    cardBg: "bg-green-50",
    dot: "bg-green-400",
    label: "Completed",
  },
} as const

function getStepStatus(count: number, stage: string) {
  if (stage === "storage") {return count > 0 ? "completed" : "idle"}
  if (count >= 100) return "busy"
  if (count === 0) return "idle"
  return "active"
}

interface BoxItem {
  id: string
  box_number: string
  current_stage: Stage
  total_books_expected: number

  lot: { lot_number: string } | null
  box_sessions?: { warehouse_time_received?: string; received_by_name?: string }[]
}

interface ScannedBook {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  transmission_status?: string | null
}

interface Transition {
  id: string
  from_stage: string | null
  to_stage: string
  moved_by_name: string | null
  notes: string | null
  created_at: string
  box: { box_number: string; lot: { lot_number: string } | null } | null
}

export default function StationCheckpointsPage() {
  const { brand } = useBrand()
  const [boxes, setBoxes] = useState<BoxItem[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [receiving, setReceiving] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [scanInput, setScanInput] = useState('')
  const [highlightBox, setHighlightBox] = useState<string | null>(null)
  const [transitionSearch, setTransitionSearch] = useState('')
  const [transitionDateFrom, setTransitionDateFrom] = useState(todayStr())
  const [transitionDateTo, setTransitionDateTo] = useState(todayStr())
  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)
  const [confirmBox, setConfirmBox] = useState<BoxItem | null>(null)
  const [undoEntry, setUndoEntry] = useState<{ box: BoxItem; fromStage: string; toStage: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scannedBox, setScannedBox] = useState<{ box: BoxItem; books: ScannedBook[] } | null>(null)
  const [loadingScannedBox, setLoadingScannedBox] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [stageModalSearch, setStageModalSearch] = useState('')
  // Simflex status per ISBN for the open box details modal
  const [boxDetailsSimflex, setBoxDetailsSimflex] = useState<Record<string, { latestStatus: string | null; transmissionCompleted: boolean }>>({})
  const [loadingBoxDetailsSimflex, setLoadingBoxDetailsSimflex] = useState(false)
  // Check Simflex in-progress / result
  const [checkingSimflexBoxId, setCheckingSimflexBoxId] = useState<string | null>(null)
  const [simflexCheckResult, setSimflexCheckResult] = useState<{ boxId: string; message: string; success: boolean; autoAdvanced?: boolean } | null>(null)
  // Pipeline transition stage filter
  const [transitionStageFilter, setTransitionStageFilter] = useState<Stage | ''>('')
  // Manual advance Simflex validation error
  const [advanceError, setAdvanceError] = useState<{ box: BoxItem; message: string; pending_isbns: string[] } | null>(null)
  // Expanded box inside the stage detail modal (accordion)
  const [expandedStageBoxId, setExpandedStageBoxId] = useState<string | null>(null)
  const [stageBoxDetails, setStageBoxDetails] = useState<Record<string, {
    books: ScannedBook[]
    simflex: Record<string, { latestStatus: string | null; transmissionCompleted: boolean }>
    loading: boolean
    loadingSimflex: boolean
  }>>({})

  // Simflex live book counts for Scan / Transmit station cards
  const [scanBooks, setScanBooks] = useState<number | null>(null)
  const [transmitBooks, setTransmitBooks] = useState<number | null>(null)

  // Simflex raw rows for the Scan / Transmit stage modals
  const [simflexRows, setSimflexRows] = useState<any[]>([])
  const [simflexRowsLoading, setSimflexRowsLoading] = useState(false)
  const [simflexRowsSearch, setSimflexRowsSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pageCountSort, setPageCountSort] = useState<'none' | 'desc' | 'asc'>('none')
  const [updatedSort, setUpdatedSort] = useState<'none' | 'desc' | 'asc'>('none')
  const [simflexPage, setSimflexPage] = useState(1)
  const SIMFLEX_PAGE_SIZE = 50

  // Use refs to track previous data and prevent unnecessary re-renders
  const prevBoxesRef = useRef<BoxItem[]>([])
  const prevTransitionsRef = useRef<Transition[]>([])

  // Keep latest filter/brand in refs so fetchData doesn't need to re-create
  const transitionStageFilterRef = useRef(transitionStageFilter)
  const brandRef = useRef(brand)
  useEffect(() => { transitionStageFilterRef.current = transitionStageFilter }, [transitionStageFilter])
  useEffect(() => { brandRef.current = brand }, [brand])

  // Helper to check if data actually changed
  const hasDataChanged = useCallback((oldData: any[], newData: any[]): boolean => {
    if (oldData.length !== newData.length) return true
    return oldData.some((item, i) => JSON.stringify(item) !== JSON.stringify(newData[i]))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const currentFilter = transitionStageFilterRef.current
      const currentBrand = brandRef.current
      const transitionUrl = `${API_URL}/api/boxes/pipeline-transitions?limit=50${currentFilter ? `&stage=${currentFilter}` : ''}`
      const [boxRes, transRes, liveRes] = await Promise.all([
        authFetch(`${API_URL}/api/boxes?exclude_assigned_storage=true`),
        authFetch(transitionUrl),
        authFetch(`${API_URL}/api/scanning/live?newProcessOnly=true&location=${currentBrand}&wipOnly=true`).catch(() => null),
      ])
      const boxData = await boxRes.json()
      const transData = await transRes.json()
      
      // Only update state if data actually changed
      if (boxData.boxes && hasDataChanged(prevBoxesRef.current, boxData.boxes)) {
        setBoxes(boxData.boxes)
        prevBoxesRef.current = boxData.boxes
      }
      if (transData.success && hasDataChanged(prevTransitionsRef.current, transData.transitions)) {
        setTransitions(transData.transitions)
        prevTransitionsRef.current = transData.transitions
      }

      // Pull Simflex book counts for Scan & Transmit cards.
      // Use the same scan-stage distinct-ISBN count as the modal row source so
      // the checkpoint Scan card matches the modal row count.
      if (liveRes && liveRes.ok) {
        const liveData = await liveRes.json()
        if (liveData.success) {
          setScanBooks(liveData.scanWipCount ?? null)
          setTransmitBooks(liveData.transmitBooks ?? null)
        }
      }

      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch checkpoint data:', e)
    } finally {
      setLoading(false)
    }
  }, [hasDataChanged])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Load Simflex rows whenever the Scan or Transmit stage modal opens
  useEffect(() => {
    if (selectedStage !== 'scan' && selectedStage !== 'transmit') {
      setSimflexRows([])
      setSimflexRowsSearch('')
      setStatusFilter('')
      setPageCountSort('none')
      setUpdatedSort('none')
      setSimflexPage(1)
      return
    }
    setSimflexRowsLoading(true)
    setSimflexRows([])
    setSimflexRowsSearch('')
    setStatusFilter('')
    setPageCountSort('none')
    setUpdatedSort('none')
    setSimflexPage(1)
    const endpoint = selectedStage === 'scan'
      ? `${API_URL}/api/scanning/scan-rows?location=${brand}`
      : `${API_URL}/api/scanning/transmit-rows?location=${brand}`
    authFetch(endpoint)
      .then(r => r.json())
      .then(d => { if (d.success) setSimflexRows(d.rows || []) })
      .catch(() => {})
      .finally(() => setSimflexRowsLoading(false))
  }, [selectedStage])

  // Reset Simflex table pagination when search/filter/sort changes
  useEffect(() => {
    setSimflexPage(1)
  }, [simflexRowsSearch, statusFilter, pageCountSort, updatedSort])

  const handleReceive = async (box: BoxItem) => {
    setReceiving(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/receive`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to receive')
      await fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceiving(null)
    }
  }

  const doAdvance = async (box: BoxItem) => {
    setAdvancing(box.id)
    setConfirmBox(null)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.pending_isbns && Array.isArray(data.pending_isbns) && data.pending_isbns.length > 0) {
          setAdvanceError({ box, message: data.error || 'Cannot advance box', pending_isbns: data.pending_isbns })
        } else {
          throw new Error(data.error || 'Failed to advance')
        }
        return
      }
      // Show undo toast for 8 seconds
      setUndoEntry({ box, fromStage: data.from_stage, toStage: data.to_stage })
      if (undoTimer.current) clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => setUndoEntry(null), 8000)
      await fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to advance box')
    } finally {
      setAdvancing(null)
    }
  }

  const handleUndo = async () => {
    if (!undoEntry) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoEntry(null)
    setAdvancing(undoEntry.box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${undoEntry.box.id}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ to_stage: undoEntry.fromStage })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to undo')
      await fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to undo')
    } finally {
      setAdvancing(null)
    }
  }

  const renderBoxAction = (box: BoxItem) => {
    const stage = box.current_stage
    const isLast = stage === 'storage'
    if (isLast) {
      return (
        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0">
          Done
        </Badge>
      )
    }
    if (stage === 'scan') {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={checkingSimflexBoxId === box.id}
          onClick={(e) => { e.stopPropagation(); handleCheckSimflexForBox(box) }}
          className="h-7 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0"
          title="Check Simflex status and auto-advance if complete"
        >
          {checkingSimflexBoxId === box.id ? '...' : 'Check'}
          {checkingSimflexBoxId !== box.id && <Zap className="h-3 w-3" />}
        </Button>
      )
    }
    if (stage === 'transmit') {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={advancing === box.id}
          onClick={(e) => { e.stopPropagation(); setConfirmBox(box) }}
          className="h-7 gap-1 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 shrink-0"
        >
          {advancing === box.id ? '...' : 'Send'}
          {advancing !== box.id && <ArrowRight className="h-3 w-3" />}
        </Button>
      )
    }
    if (stage === 'warehouse') {
      return (
        <div className="group/action relative flex items-center justify-end w-[76px] h-7 shrink-0 rounded-md cursor-pointer overflow-hidden">
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 transition-all duration-300 group-hover/action:-translate-x-full group-hover/action:opacity-0 cursor-default">
            Done
          </Badge>
          <Button
            size="sm"
            variant="default"
            disabled={advancing === box.id}
            onClick={(e) => { e.stopPropagation(); setConfirmBox(box) }}
            className="absolute inset-y-0 right-0 h-full w-full px-0 gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 opacity-0 translate-x-full group-hover/action:translate-x-0 group-hover/action:opacity-100 pointer-events-none group-hover/action:pointer-events-auto transition-all duration-300"
          >
            {advancing === box.id ? '...' : 'Send'}
            {advancing !== box.id && <ArrowRight className="h-3 w-3" />}
          </Button>
        </div>
      )
    }
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={receiving === box.id}
        onClick={(e) => { e.stopPropagation(); handleReceive(box) }}
        className="h-7 gap-1 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-50 shrink-0"
      >
        {receiving === box.id ? '...' : 'Receive'}
      </Button>
    )
  }

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const q = scanInput.trim().toLowerCase()
    if (!q) return
    const match = boxes.find(b => b.box_number.toLowerCase() === q || b.box_number.toLowerCase().includes(q))
    if (match) {
      setHighlightBox(match.id)
      setTimeout(() => setHighlightBox(null), 4000)
      document.getElementById(`box-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Also fetch and show contents
      await openBoxDetails(match)
    } else {
      toast.warning(`Box "${scanInput}" not found`)
    }
    setScanInput('')
  }

  const openBoxDetails = async (box: BoxItem) => {
    setLoadingScannedBox(true)
    setScannedBox(null)
    setBoxDetailsSimflex({})
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}`)
      const data = await res.json()
      const books: ScannedBook[] = data.box?.books || []
      setScannedBox({ box, books })

      // Fetch Simflex status when box is in scan stage
      if (box.current_stage === 'scan' && books.length > 0) {
        setLoadingBoxDetailsSimflex(true)
        const processableIsbns = [...new Set(books.filter(b => b.scan_status === 'processable').map(b => b.isbn))]
        if (processableIsbns.length > 0) {
          try {
            const simRes = await authFetch(`${API_URL}/api/scanning/simflex-status?isbns=${processableIsbns.join(',')}&location=${brand}`)
            const simData = await simRes.json()
            if (simData.success && simData.statuses) {
              setBoxDetailsSimflex(simData.statuses)
            }
          } catch {
            // Simflex status is optional; don't block the modal
          }
        }
        setLoadingBoxDetailsSimflex(false)
      }
    } catch {
      toast.error('Failed to load box contents')
    } finally {
      setLoadingScannedBox(false)
    }
  }

  const handleCheckSimflexForBox = async (box: BoxItem) => {
    setCheckingSimflexBoxId(box.id)
    setSimflexCheckResult(null)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/check-simflex`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSimflexCheckResult({ boxId: box.id, message: data.error || 'Simflex check failed', success: false })
        return
      }
      setSimflexCheckResult({
        boxId: box.id,
        message: data.message || 'Simflex check completed',
        success: true,
        autoAdvanced: data.autoAdvanced
      })
      if (data.autoAdvanced) {
        await fetchData()
      }
    } catch (e) {
      setSimflexCheckResult({ boxId: box.id, message: e instanceof Error ? e.message : 'Simflex check failed', success: false })
    } finally {
      setCheckingSimflexBoxId(null)
    }
  }

  const toggleStageBoxDetails = async (box: BoxItem) => {
    if (expandedStageBoxId === box.id) {
      setExpandedStageBoxId(null)
      return
    }
    setExpandedStageBoxId(box.id)
    if (stageBoxDetails[box.id]) return

    setStageBoxDetails(prev => ({ ...prev, [box.id]: { books: [], simflex: {}, loading: true, loadingSimflex: false } }))
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}`)
      const data = await res.json()
      const books: ScannedBook[] = data.box?.books || []
      const details: any = { books, simflex: {}, loading: false, loadingSimflex: false }

      if ((box.current_stage === 'scan' || box.current_stage === 'transmit') && books.length > 0) {
        const processableIsbns = [...new Set(books.filter(b => b.scan_status === 'processable').map(b => b.isbn))]
        if (processableIsbns.length > 0) {
          details.loadingSimflex = true
          setStageBoxDetails(prev => ({ ...prev, [box.id]: { ...details, loadingSimflex: true } }))
          try {
            const simRes = await authFetch(`${API_URL}/api/scanning/simflex-status?isbns=${processableIsbns.join(',')}&location=${brand}`)
            const simData = await simRes.json()
            if (simData.success && simData.statuses) {
              details.simflex = simData.statuses
            }
          } catch {
            // Simflex status is optional
          }
          details.loadingSimflex = false
        }
      }

      setStageBoxDetails(prev => ({ ...prev, [box.id]: details }))
    } catch {
      toast.error('Failed to load box contents')
      setStageBoxDetails(prev => ({ ...prev, [box.id]: { books: [], simflex: {}, loading: false, loadingSimflex: false } }))
    }
  }

  const boxesByStage = STAGE_ORDER.reduce<Record<Stage, BoxItem[]>>((acc, stage) => {
    let stageBoxes = boxes.filter(b => {
      if (stage === 'transmit') {
        return b.current_stage === 'scan'
      }
      return b.current_stage === stage
    })
    if (stage === 'warehouse') {
      stageBoxes = stageBoxes.filter(b => b.total_books_expected > 0)
    }
    acc[stage] = stageBoxes
    return acc
  }, {} as Record<Stage, BoxItem[]>)

  const parseDateLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Filter and pagination for transitions log
  const filteredTransitions = transitions.filter(t => {
    const q = transitionSearch.toLowerCase().trim()
    const matchesSearch = !q ||
      (t.box?.box_number || '').toLowerCase().includes(q) ||
      (t.box?.lot?.lot_number || '').toLowerCase().includes(q)
    const tDate = new Date(t.created_at)
    const from = transitionDateFrom ? parseDateLocal(transitionDateFrom) : null
    const to = transitionDateTo ? parseDateLocal(transitionDateTo) : null
    // Include the full day for the "to" date
    if (to) to.setHours(23, 59, 59, 999)
    const matchesDate = (!from || tDate >= from) && (!to || tDate <= to)
    return matchesSearch && matchesDate
  })
  const transitionsPagination = usePagination({ totalItems: filteredTransitions.length, defaultPageSize: 30 })
  const paginatedTransitions = filteredTransitions.slice(transitionsPagination.offset, transitionsPagination.offset + transitionsPagination.limit)

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return d.toLocaleString()
  }

  const STAGE_LABELS: Record<string, string> = {
    warehouse: 'Warehouse', inventory: 'Inventory', cut: 'Cut',
    endorsement: 'Endorsement', scan: 'Scan', transmit: 'Transmit', storage: 'Storage'
  }

  const lastUpdateLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
    : 'Not updated yet'

  const pipelineBorderColor = brand === 'jaguar' ? 'border-t-green-500' : 'border-t-blue-600'

  return (
    <div className={cn("flex h-dvh overflow-hidden bg-background", `theme-${brand}`)}>
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">

            {/* Box Details Modal */}
            {(scannedBox || loadingScannedBox) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setScannedBox(null)}>
                <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{scannedBox?.box.box_number}</h3>
                      <p className="text-xs text-muted-foreground">
                        {scannedBox?.box.lot?.lot_number} ┬╖ <span className="capitalize">{scannedBox?.box.current_stage}</span> ┬╖ {scannedBox?.box.total_books_expected} books
                      </p>
                    </div>
                    <button onClick={() => setScannedBox(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">Γ£ò</button>
                  </div>

                  {/* Check Simflex button for scan-stage boxes */}
                  {scannedBox?.box.current_stage === 'scan' && (
                    <div className="mb-3">
                      <button
                        onClick={() => handleCheckSimflexForBox(scannedBox.box)}
                        disabled={checkingSimflexBoxId === scannedBox.box.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        {checkingSimflexBoxId === scannedBox.box.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        {checkingSimflexBoxId === scannedBox.box.id ? 'Checking SimflexΓÇª' : 'Check Simflex'}
                      </button>
                      {simflexCheckResult?.boxId === scannedBox.box.id && (
                        <div className={`mt-2 text-xs px-3 py-2 rounded-lg border ${simflexCheckResult.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                          {simflexCheckResult.message}
                        </div>
                      )}
                    </div>
                  )}

                  {loadingScannedBox ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Loading contents...</p>
                  ) : scannedBox && scannedBox.books.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No scan records found for this box.</p>
                  ) : (
                    <div className="overflow-y-auto flex-1">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-card">
                          <tr className="text-muted-foreground border-b border-border">
                            <th className="pb-2 text-left font-medium w-6">#</th>
                            <th className="pb-2 text-left font-medium pr-3">ISBN</th>
                            <th className="pb-2 text-left font-medium pr-3">Title</th>
                            <th className="pb-2 text-left font-medium pr-3">Status</th>
                            <th className="pb-2 text-left font-medium pr-3">Stage</th>
                            {(scannedBox?.box.current_stage === 'scan' || scannedBox?.box.current_stage === 'transmit') && (
                              <th className="pb-2 text-left font-medium">Simflex</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {scannedBox?.books.map((book, i) => {
                            const simflex = book.isbn ? boxDetailsSimflex[book.isbn] : null
                            return (
                              <tr key={book.id} className="border-b border-border/40 last:border-0">
                                <td className="py-1.5 text-muted-foreground pr-2">{i + 1}</td>
                                <td className="py-1.5 pr-3">{book.isbn}</td>
                                <td className="py-1.5 pr-3 max-w-[220px] truncate text-foreground">{book.title || 'ΓÇö'}</td>
                                <td className="py-1.5 pr-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : book.scan_status === 'non_processable' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {book.scan_status === 'processable' ? 'Processable' : book.scan_status === 'non_processable' ? 'Non-Processable' : book.scan_status}
                                  </span>
                                </td>
                                <td className="py-1.5 pr-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize bg-gray-100 text-gray-700">
                                    {scannedBox?.box.current_stage || 'ΓÇö'}
                                  </span>
                                </td>
                                {(scannedBox?.box.current_stage === 'scan' || scannedBox?.box.current_stage === 'transmit') && (
                                  <td className="py-1.5">
                                    {book.scan_status !== 'processable' ? (
                                      <span className="text-[10px] text-muted-foreground">ΓÇö</span>
                                    ) : loadingBoxDetailsSimflex ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    ) : !simflex ? (
                                      <span className="text-[10px] text-muted-foreground">Not found</span>
                                    ) : simflex.transmissionCompleted ? (
                                      <span className="flex items-center gap-1 text-[10px] font-medium text-green-700">
                                        <CheckCircle className="h-3 w-3" /> Done
                                      </span>
                                    ) : simflex.latestStatus ? (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 truncate max-w-[140px] block">
                                        {simflex.latestStatus}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">Not found</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Advance Validation Error Modal */}
            {advanceError && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAdvanceError(null)}>
                <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                    <X className="h-4 w-4 text-destructive" /> Cannot Advance Box
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    <span className="font-semibold text-foreground">{advanceError.box.box_number}</span> cannot move to Transmission because not all processable ISBNs are verified in Simflex.
                  </p>
                  <div className="bg-muted/40 rounded-lg border border-border p-3 mb-4 max-h-48 overflow-y-auto">
                    <p className="text-xs font-medium text-foreground mb-2">Pending ISBNs:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {advanceError.pending_isbns.map(isbn => <li key={isbn}>{isbn}</li>)}
                    </ul>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setAdvanceError(null)} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">OK</button>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Dialog */}
            {confirmBox && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                  <h3 className="text-base font-semibold text-foreground mb-1">Confirm Receive</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    Move <span className="font-semibold text-foreground">{confirmBox.box_number}</span> from
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STAGE_META[confirmBox.current_stage]?.color}`}>
                      {STAGE_META[confirmBox.current_stage]?.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STAGE_META[confirmBox.current_stage === 'scan' ? 'storage' : STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) + 1]]?.color}`}>
                      {STAGE_META[confirmBox.current_stage === 'scan' ? 'storage' : STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) + 1]]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Make sure the box has physically arrived at the next station before confirming.</p>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setConfirmBox(null)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={() => doAdvance(confirmBox)} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">Yes, Confirm</button>
                  </div>
                </div>
              </div>
            )}

            {/* Stage Detail Modal */}
            {selectedStage && (
              (() => {
                const stageBoxes = boxesByStage[selectedStage]
                const meta = STAGE_META[selectedStage]
                const filteredBoxes = stageBoxes.filter(box => {
                  const q = stageModalSearch.toLowerCase().trim()
                  if (!q) return true
                  return box.box_number.toLowerCase().includes(q) || (box.lot?.lot_number || '').toLowerCase().includes(q)
                })
                const borderClass = meta.color.split(' ').find(c => c.startsWith('border-')) || 'border-gray-300'
                const textClass = meta.color.split(' ').find(c => c.startsWith('text-')) || 'text-gray-700'
                const StageIcon = meta.icon
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedStage(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", meta.color)}>
                            <StageIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{meta.label}</h3>
                            <p className="text-xs text-muted-foreground">{stageBoxes.length} {stageBoxes.length === 1 ? 'box' : 'boxes'} waiting</p>

                          </div>
                        </div>
                        <button onClick={() => setSelectedStage(null)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Search */}
                      <div className="p-4 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder={selectedStage === 'scan' || selectedStage === 'transmit' ? 'Search ISBN, box, or userΓÇª' : 'Search box number or lot...'}
                            value={selectedStage === 'scan' || selectedStage === 'transmit' ? simflexRowsSearch : stageModalSearch}
                            onChange={e => selectedStage === 'scan' || selectedStage === 'transmit' ? setSimflexRowsSearch(e.target.value) : setStageModalSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      {/* Box list for all stages */}
                      <div className="flex-1 overflow-y-auto p-4">
                          {filteredBoxes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                              {stageModalSearch ? 'No matching boxes found.' : 'No boxes at this station.'}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {filteredBoxes.map(box => {
                                const isExpanded = expandedStageBoxId === box.id
                                const details = stageBoxDetails[box.id]
                                const latestTransition = transitions.find(t => t.box?.box_number === box.box_number && t.to_stage === box.current_stage)
                                return (
                                  <div
                                    key={box.id}
                                    id={`box-${box.id}`}
                                    className={cn(
                                      "rounded-lg border overflow-hidden transition-all bg-card hover:shadow-sm",
                                      highlightBox === box.id ? 'border-primary' : 'border-border',
                                      isExpanded && `border-l-4 ${borderClass}`
                                    )}
                                  >
                                    <div 
                                      className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 cursor-pointer group hover:bg-slate-50 transition-colors gap-3"
                                      onClick={() => toggleStageBoxDetails(box)}
                                    >
                                      {/* Left side: Box & Lot */}
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold text-foreground truncate">
                                            BOX: {box.box_number}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            LOT: {box.lot?.lot_number || 'ΓÇö'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Middle section: Book numbers, Station, Received By */}
                                      <div className="grid grid-cols-3 gap-4 sm:flex sm:items-center sm:gap-6 text-left shrink-0">
                                        <div className="min-w-[80px]">
                                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Books</span>
                                          <span className="text-xs font-semibold text-foreground">
                                            {box.total_books_expected} expected
                                          </span>
                                        </div>

                                        <div className="min-w-[90px]">
                                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Station</span>
                                          <span className="text-xs font-semibold text-foreground capitalize">
                                            {STAGE_META[box.current_stage]?.label || box.current_stage}
                                          </span>
                                        </div>

                                        <div className="min-w-[130px] col-span-1">
                                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Received By</span>
                                          <span className="text-xs font-semibold text-foreground truncate block max-w-[120px]" title={latestTransition?.moved_by_name || 'ΓÇö'}>
                                            {latestTransition?.moved_by_name || 'ΓÇö'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Right side: Timestamp */}
                                      <div className="text-left sm:text-right shrink-0 min-w-[100px] pr-2">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Received At</span>
                                        <span className="text-xs font-semibold text-muted-foreground">
                                          {latestTransition?.created_at
                                            ? new Date(latestTransition.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                            : 'ΓÇö'}
                                        </span>
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="border-t border-border bg-slate-50 px-3 py-3">
                                        {details?.loading ? (
                                          <p className="text-xs text-muted-foreground py-2">Loading contents...</p>
                                        ) : !details || details.books.length === 0 ? (
                                          <p className="text-xs text-muted-foreground py-2">No scan records found for this box.</p>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                              <thead>
                                                <tr className="text-muted-foreground border-b border-border">
                                                  <th className="pb-2 text-left font-medium pr-3">ISBN</th>
                                                  <th className="pb-2 text-left font-medium pr-3">Title</th>
                                                  <th className="pb-2 text-left font-medium pr-3">Status</th>
                                                  <th className="pb-2 text-left font-medium pr-3">Stage</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {details.books.filter(book => {
                                                  const status = details.simflex?.[book.isbn]?.latestStatus || book.transmission_status || '';
                                                  if (selectedStage === 'scan') {
                                                    return ['Scanning ONGOING', 'Scanning COMPLETED', 'Validate ONGOING', 'Validate COMPLETED', 'Jaguar Validate ONGOING', 'Jaguar Validate COMPLETED', 'Tif2PDF ONGOING', 'Tif2PDF COMPLETED', 'Preval ONGOING', 'Preval COMPLETED'].includes(status);
                                                  }
                                                  if (selectedStage === 'transmit') {
                                                    return status.includes('Transmission_Archive') || status === 'COMPLETED';
                                                  }
                                                  return true;
                                                }).map((book) => {
                                                  const simflexStatus = details.simflex?.[book.isbn]?.latestStatus || book.transmission_status || 'Not found';
                                                  const isTransmissionCompleted = simflexStatus === 'COMPLETED' || simflexStatus === 'Transmission_Archive COMPLETED';
                                                  return (
                                                  <tr key={book.id} className="border-b border-border/40 last:border-0">
                                                    <td className="py-1.5 pr-3 text-foreground">{book.isbn}</td>
                                                    <td className="py-1.5 pr-3 max-w-[160px] truncate text-foreground">{book.title || 'ΓÇö'}</td>
                                                    <td className="py-1.5 pr-3">
                                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : book.scan_status === 'non_processable' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {book.scan_status === 'processable' ? 'Processable' : book.scan_status === 'non_processable' ? 'Non-Processable' : book.scan_status}
                                                      </span>
                                                    </td>
                                                    <td className="py-1.5 pr-3">
                                                      {isTransmissionCompleted ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-medium text-green-700">
                                                          <CheckCircle className="h-3 w-3" /> Done
                                                        </span>
                                                      ) : (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize bg-gray-100 text-gray-700">
                                                          {simflexStatus}
                                                        </span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )})}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>


                      {/* Footer */}
                      <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span>{filteredBoxes.length} {filteredBoxes.length === 1 ? 'box' : 'boxes'} shown</span>
                        <button onClick={() => setSelectedStage(null)} className="text-primary hover:text-primary/80 font-medium">Close</button>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}

            {/* Undo Toast */}
            {undoEntry && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
                <span className="text-foreground">
                  <span className="font-semibold">{undoEntry.box.box_number}</span> moved to <span className="font-semibold capitalize">{STAGE_LABELS[undoEntry.toStage]}</span>
                </span>
                <button onClick={handleUndo} className="ml-2 px-3 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 text-xs font-semibold transition-colors">Undo</button>
                <button onClick={() => { setUndoEntry(null); if (undoTimer.current) clearTimeout(undoTimer.current) }} className="text-muted-foreground hover:text-foreground">Γ£ò</button>
              </div>
            )}

            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Station Checkpoint Monitor</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manually receive boxes at each station to advance them through the pipeline.
                </p>
              </div>
              <RefreshControl onRefresh={fetchData} refreshing={loading} lastUpdated={lastUpdated} storageKey="checkpoints" className="hidden sm:flex" />
            </header>

            {/* Pipeline Stage Flow */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 flex-wrap">
                {STAGE_ORDER.map((stage, i) => {
                  const meta = STAGE_META[stage]
                  const count = boxesByStage[stage]?.length || 0
                  return (
                    <div key={stage} className="flex items-center gap-1">
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${meta.color}`}>
                        <meta.icon className="h-3 w-3" />
                        {meta.label}
                        {count > 0 && <span className="ml-1 bg-white/60 rounded-full px-1.5 font-bold">{count}</span>}
                      </span>
                      {i < STAGE_ORDER.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                  )
                })}
              </div>


            </div>

            {/* Station Cards Grid */}
            {loading ? (
              <div className="text-center py-16 text-sm text-muted-foreground">Loading stations...</div>
            ) : (
              <div className={cn("bg-card border border-border rounded-2xl p-5 shadow-sm border-t-2", pipelineBorderColor)}>
                {/* Desktop: 7 inline columns */}
                <div className="hidden lg:flex items-stretch gap-3">
                  {STAGE_ORDER.map((stage) => {
                    const meta = STAGE_META[stage]
                    const stageBoxes = boxesByStage[stage]
                    const count = stageBoxes.length
                    
                    const status = getStepStatus(count, stage)
                    const cfg = statusConfig[status]

                    const iconColorCls = status === 'active'
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : status === 'busy'
                      ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'

                    return (
                      <div
                        key={stage}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedStage(stage); setStageModalSearch('') }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setSelectedStage(stage); setStageModalSearch('') }}}
                        className={cn(
                          "flex-1 min-w-0 rounded-xl border border-border bg-card shadow-xs p-3.5 flex flex-col cursor-pointer transition-all duration-200 hover:shadow-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/30 border-t-4 select-none",
                          status === 'active' && "border-t-blue-400",
                          status === 'busy' && "border-t-orange-400",
                          status === 'idle' && "border-t-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border shrink-0", iconColorCls)}>
                            <meta.icon className="h-4 w-4" />
                          </div>
                          <span className={cn("text-xl font-extrabold leading-none truncate", cfg.countColor)}>
                            {stageBoxes.length}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-card-foreground mt-auto truncate" title={meta.label}>
                          {meta.label}
                        </h3>
                        <div className="flex items-center gap-1 mt-1.5 shrink-0">
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Mobile: 2-column grid */}
                <div className="grid grid-cols-2 gap-3 lg:hidden">
                  {STAGE_ORDER.map((stage) => {
                    const meta = STAGE_META[stage]
                    const stageBoxes = boxesByStage[stage]
                    const count = stageBoxes.length
                    
                    const status = getStepStatus(count, stage)
                    const cfg = statusConfig[status]

                    const iconColorCls = status === 'active'
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : status === 'busy'
                      ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'

                    return (
                      <div
                        key={stage}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedStage(stage); setStageModalSearch('') }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setSelectedStage(stage); setStageModalSearch('') }}}
                        className={cn(
                          "rounded-xl border border-border bg-card shadow-xs p-3.5 flex flex-col cursor-pointer transition-all duration-200 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/30 border-t-4 select-none",
                          status === 'active' && "border-t-blue-400",
                          status === 'busy' && "border-t-orange-400",
                          status === 'idle' && "border-t-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border shrink-0", iconColorCls)}>
                            <meta.icon className="h-4 w-4" />
                          </div>
                          <span className={cn("text-xl font-extrabold leading-none truncate", cfg.countColor)}>
                            {stageBoxes.length}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-card-foreground mt-auto truncate">{meta.label}</h3>
                        <div className="flex items-center gap-1 mt-1.5 shrink-0">
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Status Legend */}
                <div className="flex items-center gap-4 text-xs mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    <span className="text-xs text-muted-foreground">Busy / Bottleneck</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-xs text-muted-foreground">Idle</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="text-xs text-muted-foreground">Completed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline Transition Logs */}
            <Card className="border-border bg-card overflow-hidden py-0 gap-0">
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500 text-white">
                    <Scan className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-card-foreground">Pipeline Transition Log</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {filteredTransitions.length} of {transitions.length} entries
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="px-5 py-3 border-b border-border bg-card flex flex-wrap items-end gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search box or lot..."
                    value={transitionSearch}
                    onChange={e => setTransitionSearch(e.target.value)}
                    className="pl-9 h-9 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Stage</label>
                  <Select value={transitionStageFilter || 'all'} onValueChange={v => setTransitionStageFilter(v === 'all' ? '' : v as Stage)}>
                    <SelectTrigger className="h-9 w-[150px] text-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                      <SelectValue placeholder="All stages" />
                    </SelectTrigger>  
                    <SelectContent>
                      <SelectItem value="all">All stages</SelectItem>
                      {STAGE_ORDER.map(stage => (
                        <SelectItem key={stage} value={stage}>{STAGE_META[stage].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {transitionDateFrom ? format(new Date(transitionDateFrom), 'MMM dd, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={transitionDateFrom ? new Date(transitionDateFrom) : undefined}
                        onSelect={date => { setTransitionDateFrom(date ? format(date, 'yyyy-MM-dd') : ''); setFromDateOpen(false) }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {transitionDateTo ? format(new Date(transitionDateTo), 'MMM dd, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={transitionDateTo ? new Date(transitionDateTo) : undefined}
                        onSelect={date => { setTransitionDateTo(date ? format(date, 'yyyy-MM-dd') : ''); setToDateOpen(false) }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <CardContent className="p-0">
                {transitions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No transitions logged yet. Use &quot;Receive&quot; buttons above to advance boxes.
                  </div>
                ) : filteredTransitions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No transitions match your search or date filters.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent bg-muted/30">
                        <TableHead className="text-xs text-muted-foreground font-medium px-4 py-3">Box</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium px-4 py-3">Lot</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium px-4 py-3">From</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium px-4 py-3">To</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium px-4 py-3">Received By</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium px-4 py-3 text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransitions.map((t) => (
                        <TableRow key={t.id} className="border-border hover:bg-muted/30">
                          <TableCell className="text-xs text-card-foreground px-4 py-3">
                            {t.box?.box_number || 'ΓÇö'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-4 py-3">
                            {t.box?.lot?.lot_number || 'ΓÇö'}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {t.from_stage ? (
                              <Badge variant="outline" className={cn("text-[10px] font-normal capitalize border", STAGE_META[t.from_stage as Stage]?.color || '')}>
                                {STAGE_META[t.from_stage as Stage]?.label || t.from_stage}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">ΓÇö</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline" className={cn("text-[10px] font-normal capitalize border", STAGE_META[t.to_stage as Stage]?.color || '')}>
                              {STAGE_META[t.to_stage as Stage]?.label || t.to_stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-4 py-3">
                            {t.moved_by_name || 'ΓÇö'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground text-right px-4 py-3">
                            {formatTime(t.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {filteredTransitions.length > 0 && (
                  <Pagination
                    currentPage={transitionsPagination.currentPage}
                    totalPages={transitionsPagination.totalPages}
                    pageSize={transitionsPagination.pageSize}
                    onPageChange={transitionsPagination.goToPage}
                    onPageSizeChange={transitionsPagination.setPageSize}
                    canPrevPage={transitionsPagination.canPrevPage}
                    canNextPage={transitionsPagination.canNextPage}
                    pageSizeOptions={[10, 30, 50, 100]}
                  />
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  )
}
