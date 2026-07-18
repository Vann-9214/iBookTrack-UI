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
import { Scan, Package, Scissors, CheckCircle, Camera, FileCheck, Barcode, ClipboardCheck, Archive, Activity,
  Shield, Radio, Warehouse, ArrowRight, RefreshCw, ChevronRight, ChevronDown, Search, X, Calendar as CalendarIcon,
  Loader2, Zap, MapPin } from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"
import { PageLoader } from '@/components/ui/page-loader'
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

const todayStr = () => new Date().toISOString().split('T')[0]

const STAGE_ORDER = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage'] as const
type Stage = typeof STAGE_ORDER[number]

const STAGE_META: Record<Stage, { label: string; icon: React.ElementType; color: string; solidBg: string }> = {
  warehouse:   { label: 'Warehouse',   icon: Package,     color: 'bg-indigo-100 text-indigo-700 border-indigo-300',     solidBg: 'bg-indigo-500' },
  inventory:   { label: 'Inventory',   icon: Warehouse,   color: 'bg-cyan-100 text-cyan-700 border-cyan-300',           solidBg: 'bg-cyan-500' },
  cut:         { label: 'Cut',         icon: Scissors,    color: 'bg-orange-100 text-orange-700 border-orange-300',     solidBg: 'bg-orange-500' },
  endorsement: { label: 'Endorsement', icon: CheckCircle, color: 'bg-amber-100 text-amber-700 border-amber-300',        solidBg: 'bg-amber-500' },
  scan:        { label: 'Scan',        icon: Camera,      color: 'bg-blue-100 text-blue-700 border-blue-300',           solidBg: 'bg-blue-500' },
  transmit:    { label: 'Transmit',    icon: Radio,       color: 'bg-violet-100 text-violet-700 border-violet-300',     solidBg: 'bg-violet-500' },
  storage:     { label: 'Storage',     icon: Warehouse,   color: 'bg-emerald-100 text-emerald-700 border-emerald-300',  solidBg: 'bg-emerald-500' },
}

const getStepStatus = (count: number) => {
  if (count === 0) return "idle"
  return "active"
}

const getStatusConfig = (status: string, brand: string) => {
  if (status === 'active') {
    return {
      nodeRing: brand === 'jaguar' ? "border-green-400 text-green-500" : "border-blue-400 text-blue-500",
      countColor: brand === 'jaguar' ? "text-green-500" : "text-blue-500",
      bar: brand === 'jaguar' ? "bg-green-400" : "bg-blue-400",
      cardBg: brand === 'jaguar' ? "bg-green-50" : "bg-blue-50",
      dot: brand === 'jaguar' ? "bg-green-400" : "bg-blue-400",
      label: "Active",
      borderTop: brand === 'jaguar' ? "border-t-green-400" : "border-t-blue-400",
      borderGradient: "bg-gradient-to-r from-primary via-primary/50 to-transparent",
      iconColorCls: brand === 'jaguar' ? "bg-green-100 text-green-700 border-green-200" : "bg-blue-100 text-blue-700 border-blue-200",
    }
  }
  // idle
  return {
    nodeRing: "border-gray-200 text-gray-400",
    countColor: "text-gray-400",
    bar: "bg-gray-200",
    cardBg: "bg-background",
    dot: "bg-gray-300",
    label: "Idle",
    borderTop: "border-t-transparent",
    borderGradient: "",
    iconColorCls: "bg-gray-50 text-gray-400 border-gray-200",
  }
}

const getRelevantTimeForBox = (box: any, stage: string): string | null => {
  const session = box.box_sessions?.[0]
  if (!session) return null
  
  const status = session.status
  
  if (stage === 'warehouse') {
    if (status === 'completed') return session.updated_at
    if (status === 'received') return session.warehouse_time_received || session.updated_at
    if (status === 'sent') return session.updated_at
  } else if (stage === 'inventory') {
    if (status === 'completed') return session.inventory_time_send || session.updated_at
    if (status === 'received') return session.inventory_time_received || session.updated_at
    if (status === 'sent') return session.inventory_time_send || session.updated_at
    if (box.latest_inventory_scan_at) return box.latest_inventory_scan_at
  } else if (stage === 'cut') {
    if (status === 'completed') return session.cut_time_send || session.updated_at
    if (status === 'received') return session.cut_time_received || session.updated_at
    if (status === 'sent') return session.cut_time_send || session.updated_at
  } else if (stage === 'endorsement') {
    if (status === 'completed') return session.endorsement_time_send || session.updated_at
    if (status === 'received') return session.endorsement_time_received || session.updated_at
    if (status === 'sent') return session.endorsement_time_send || session.updated_at
    if (box.latest_endorsement_scan_at) return box.latest_endorsement_scan_at
  } else if (stage === 'scan') {
    return session.scan_time_received || session.updated_at
  }
  
  return session.updated_at
}

interface BoxItem {
  id: string
  box_number: string
  current_stage: Stage
  total_expected_books: number
  is_fully_completed_in_simflex?: boolean

  lot: { lot_number: string } | null
  box_sessions?: { 
    warehouse_time_received?: string; 
    inventory_time_received?: string;
    inventory_time_send?: string;
    cut_time_received?: string;
    cut_time_send?: string;
    endorsement_time_received?: string;
    endorsement_time_send?: string;
    scan_time_received?: string;
    updated_at?: string;
    status?: string;
    total_scanned_books?: number;
    total_accepted_books?: number;
  }[]
}

interface ScannedBook {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  transmission_status?: string | null
  flag?: {
    issue: string
    remarks: string
  } | null
}

interface Transition {
  id: string
  from_stage: string | null
  to_stage: string
  moved_by_name: string | null
  notes: string | null
  created_at: string
  box: { 
    box_number: string
    lot: { lot_number: string } | null
    current_stage: Stage
    total_expected_books: number
    created_at: string
  } | null

  // session properties
  warehouse_user_name?: string
  warehouse_time_received?: string
  warehouse_scan_name?: string
  warehouse_scan_at?: string

  inventory_user_name?: string
  inventory_time_received?: string
  inventory_scan_name?: string
  inventory_scan_at?: string
  inventory_send_name?: string
  inventory_time_send?: string

  cut_user_name?: string
  cut_time_received?: string
  cut_send_name?: string
  cut_time_send?: string

  endorsement_user_name?: string
  endorsement_time_received?: string
  endorsement_scan_name?: string
  endorsement_scan_at?: string
  endorsement_send_name?: string
  endorsement_time_send?: string

  scan_user_name?: string
  scan_time_received?: string

  storage_user_name?: string
  storage_time_assigned?: string

  total_scanned_books?: number
  updated_at?: string
}

const SIMFLEX_STAGE_LABELS: Record<string, string> = {
  Scanning: 'Scan',
  Tif2PDF: 'PDF',
  Preval: 'Preval',
  Transmission_Archive: 'Transmission',
  Transmission_Archived: 'Transmission',
};

function formatSimflexStatus(raw: string | undefined | null) {
  if (!raw) return raw;
  const parts = raw.split(' ');
  const stage = parts[0];
  const status = parts.slice(1).join(' ');
  const label = SIMFLEX_STAGE_LABELS[stage] ?? stage;
  const prettyStatus = status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : '';
  return `${label} ${prettyStatus}`.trim();
}

export default function StationCheckpointsPage() {
  const { brand } = useBrand()
  const [boxes, setBoxes] = useState<BoxItem[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [totalTransitions, setTotalTransitions] = useState(0)
  const [topLoading, setTopLoading] = useState(true)
  const [transitionsLoading, setTransitionsLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [receiving, setReceiving] = useState<string | null>(null)
  const [sendingForward, setSendingForward] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [scanInput, setScanInput] = useState('')
  const [highlightBox, setHighlightBox] = useState<string | null>(null)
  const [transitionSearchInput, setTransitionSearchInput] = useState('')
  const [transitionSearch, setTransitionSearch] = useState('')
  const [transitionDateFrom, setTransitionDateFrom] = useState('')
  const [transitionDateTo, setTransitionDateTo] = useState('')
  const transitionsPagination = usePagination({ totalItems: totalTransitions, defaultPageSize: 50 })
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null)
  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)
  const [confirmBox, setConfirmBox] = useState<BoxItem | null>(null)
  const [confirmActionType, setConfirmActionType] = useState<'receive' | 'send_forward' | 'advance' | null>(null)
  const [undoEntry, setUndoEntry] = useState<{ box: BoxItem; fromStage: string; toStage: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scannedBox, setScannedBox] = useState<{ box: BoxItem; books: ScannedBook[] } | null>(null)
  const [loadingScannedBox, setLoadingScannedBox] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [stageModalSearch, setStageModalSearch] = useState('')
  const [stageModalPage, setStageModalPage] = useState(1)
  // Simflex status per ISBN for the open box details modal
  const [boxDetailsSimflex, setBoxDetailsSimflex] = useState<Record<string, { latestStatus: string | null; transmissionCompleted: boolean }>>({})
  const [loadingBoxDetailsSimflex, setLoadingBoxDetailsSimflex] = useState(false)
  // Check Simflex in-progress / result
  const [checkingSimflexBoxId, setCheckingSimflexBoxId] = useState<string | null>(null)
  const [simflexCheckResult, setSimflexCheckResult] = useState<{ boxId: string; message: string; success: boolean; autoAdvanced?: boolean } | null>(null)
  // Pipeline transition stage filter
  const [transitionStageFilter, setTransitionStageFilter] = useState<Stage | ''>('')
  const [advanceError, setAdvanceError] = useState<{ box: BoxItem; message: string; pending_isbns: string[] } | null>(null)
  // Expanded box inside the stage detail modal (accordion)
  const [expandedStageBoxId, setExpandedStageBoxId] = useState<string | null>(null)
  const [hasAutoCheckedScan, setHasAutoCheckedScan] = useState(false)
  const [stageBoxDetails, setStageBoxDetails] = useState<Record<string, {
    books: ScannedBook[]
    simflex: Record<string, { latestStatus: string | null; transmissionCompleted: boolean }>
    loading: boolean
    loadingSimflex: boolean
  }>>({})

  // Simflex live book counts for Scan / Transmit station cards
  const [scanBooks, setScanBooks] = useState<number | null>(null)
  const [transmitBooks, setTransmitBooks] = useState<number | null>(null)

  // Box numbers that have at least one book in the scan-WIP range
  // (Scanning ONGOING → Preval COMPLETED). Populated at page load so the
  // Scan card count and the modal list stay in sync.
  const [scanEligibleBoxNums, setScanEligibleBoxNums] = useState<Set<string> | null>(null)
  const [transmitEligibleBoxNums, setTransmitEligibleBoxNums] = useState<Set<string> | null>(null)

  // Simflex raw rows for the Scan / Transmit stage modals
  const [simflexRows, setSimflexRows] = useState<any[]>([])
  const [simflexRowsLoading, setSimflexRowsLoading] = useState(false)
  const [simflexRowsSearch, setSimflexRowsSearch] = useState('')

  // Removed the auto-check useEffect that was causing annoying toast popups when opening the Scan card
  const [statusFilter, setStatusFilter] = useState('')
  const [pageCountSort, setPageCountSort] = useState<'none' | 'desc' | 'asc'>('none')
  const [updatedSort, setUpdatedSort] = useState<'none' | 'desc' | 'asc'>('none')
  const [simflexPage, setSimflexPage] = useState(1)
  const SIMFLEX_PAGE_SIZE = 50

  // Use refs to track previous data and prevent unnecessary re-renders
  const prevBoxesRef = useRef<BoxItem[]>([])
  const prevTransitionsRef = useRef<Transition[]>([])

  const transitionStageFilterRef = useRef(transitionStageFilter)
  const transitionSearchRef = useRef(transitionSearch)
  const transitionDateFromRef = useRef(transitionDateFrom)
  const transitionDateToRef = useRef(transitionDateTo)
  const transitionOffsetRef = useRef(transitionsPagination.offset)
  const brandRef = useRef(brand)
  useEffect(() => { transitionStageFilterRef.current = transitionStageFilter }, [transitionStageFilter])
  useEffect(() => { transitionSearchRef.current = transitionSearch }, [transitionSearch])
  useEffect(() => { transitionDateFromRef.current = transitionDateFrom }, [transitionDateFrom])
  useEffect(() => { transitionDateToRef.current = transitionDateTo }, [transitionDateTo])
  useEffect(() => { transitionOffsetRef.current = transitionsPagination.offset }, [transitionsPagination.offset])
  useEffect(() => { brandRef.current = brand }, [brand])

  // Reset pagination when stage opens
  useEffect(() => {
    if (selectedStage) setStageModalPage(1)
  }, [selectedStage])

  // Helper to check if data actually changed
  const hasDataChanged = useCallback((oldData: any[], newData: any[]): boolean => {
    if (oldData.length !== newData.length) return true
    return oldData.some((item, i) => JSON.stringify(item) !== JSON.stringify(newData[i]))
  }, [])

  const fetchData = useCallback(async (opts?: { skipTop?: boolean }) => {
    if (!opts?.skipTop) setTopLoading(true)
    setTransitionsLoading(true)
    try {
      const currentFilter = transitionStageFilterRef.current
      const currentSearch = transitionSearchRef.current
      const currentDateFrom = transitionDateFromRef.current
      const currentDateTo = transitionDateToRef.current
      const currentBrand = brandRef.current
      
      const transitionParams = new URLSearchParams({
        limit: '50',
        offset: String(transitionOffsetRef.current || 0),
        box_type: currentBrand
      })
      if (currentFilter) transitionParams.append('stage', currentFilter)
      if (currentSearch) transitionParams.append('search', currentSearch)
      if (currentDateFrom) transitionParams.append('date_from', currentDateFrom)
      if (currentDateTo) transitionParams.append('date_to', currentDateTo)

      const transitionUrl = `${API_URL}/api/boxes/pipeline-transitions?${transitionParams.toString()}`
      
      let boxData, liveData, scanRowsData, transmitRowsData;
      let transData;

      if (!opts?.skipTop) {
        const [boxRes, transRes, liveRes, scanRowsRes, transmitRowsRes] = await Promise.all([
          authFetch(`${API_URL}/api/boxes?exclude_assigned_storage=true&box_type=${currentBrand}`),
          authFetch(transitionUrl),
          authFetch(`${API_URL}/api/scanning/live?newProcessOnly=true&location=${currentBrand}&wipOnly=true`).catch(() => null),
          authFetch(`${API_URL}/api/scanning/scan-rows?location=${currentBrand}`).catch(() => null),
          authFetch(`${API_URL}/api/scanning/transmit-rows?location=${currentBrand}`).catch(() => null),
        ])
        boxData = await boxRes.json()
        transData = await transRes.json()
        if (liveRes && liveRes.ok) liveData = await liveRes.json()
        if (scanRowsRes && scanRowsRes.ok) scanRowsData = await scanRowsRes.json()
        if (transmitRowsRes && transmitRowsRes.ok) transmitRowsData = await transmitRowsRes.json()
      } else {
        const transRes = await authFetch(transitionUrl)
        transData = await transRes.json()
      }
      
      // Only update state if data actually changed
      if (boxData && boxData.boxes && hasDataChanged(prevBoxesRef.current, boxData.boxes)) {
        setBoxes(boxData.boxes)
        prevBoxesRef.current = boxData.boxes
      }
      if (transData.success && hasDataChanged(prevTransitionsRef.current, transData.transitions)) {
        setTransitions(transData.transitions)
        setTotalTransitions(transData.totalCount || 0)
        prevTransitionsRef.current = transData.transitions
      }

      // Pull Simflex book counts for Scan card.
      if (liveData && liveData.success) {
        setScanBooks(liveData.scanWipCount ?? null)
      }

      // Populate the set of box numbers that have at least one book in the
      // scan-WIP status range (Scanning ONGOING → Preval COMPLETED).
      // This is used both for the card count and the modal box list.
      if (scanRowsData && scanRowsData.success) {
        const eligible = new Set<string>(
          (scanRowsData.rows || []).map((r: any) => String(r.BoxNumber || '')).filter(Boolean)
        )
        setScanEligibleBoxNums(eligible)
      }

      // Transmit card count: use DB-validated transmit-rows count so it matches
      // the modal list (only books in our DB whose box is still in scan stage,
      // correct brand, and confirmed processable).
      if (transmitRowsData && transmitRowsData.success) {
        setTransmitBooks(transmitRowsData.count ?? 0)
        const transmitEligible = new Set<string>(
          (transmitRowsData.rows || []).map((r: any) => String(r.BoxNumber || '')).filter(Boolean)
        )
        setTransmitEligibleBoxNums(transmitEligible)
      }

      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch checkpoint data:', e)
    } finally {
      if (!opts?.skipTop) setTopLoading(false)
      setTransitionsLoading(false)
    }
  }, [hasDataChanged])

  useEffect(() => {
    fetchData({ skipTop: true })
  }, [fetchData, transitionStageFilter, transitionSearch, transitionDateFrom, transitionDateTo, transitionsPagination.offset])

  useEffect(() => {
    fetchData()
  }, [fetchData, brand])

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

  const handleSendForward = async (box: BoxItem) => {
    setSendingForward(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/send-forward`, {
        method: 'POST',
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send forward')
      await fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send box')
    } finally {
      setSendingForward(null)
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
    const isFirst = stage === 'warehouse'
    const isLast = stage === 'storage'
    if (isLast) {
      return (
        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0">
          Done
        </Badge>
      )
    }
    if (stage === 'warehouse') {
      const latestSession = box.box_sessions?.[0]
      const status = latestSession?.status || 'sent'
      
      if (status === 'completed') {
        return (
          <div className="group/action relative flex items-center justify-end w-[76px] h-7 shrink-0 rounded-md cursor-pointer overflow-hidden">
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 transition-all duration-300 group-hover/action:-translate-x-full group-hover/action:opacity-0 cursor-default flex items-center justify-center w-full h-full text-center">
              Complete
            </Badge>
            <Button size="sm" variant="default" disabled={advancing === box.id} onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('advance'); }} className="absolute inset-y-0 right-0 h-full w-full px-0 gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 opacity-0 translate-x-full group-hover/action:translate-x-0 group-hover/action:opacity-100 pointer-events-none group-hover/action:pointer-events-auto transition-all duration-300">
              {advancing === box.id ? '...' : 'Send'}
              {advancing !== box.id && <ArrowRight className="h-3 w-3" />}
            </Button>
          </div>
        )
      } else if (status === 'received') {
        return (
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] shrink-0 flex items-center justify-center w-[76px] h-7 cursor-default",
              brand === 'jaguar' 
                ? "border-green-300 text-green-700 bg-green-50"
                : "border-blue-300 text-blue-700 bg-blue-50"
            )}
          >
            Received
          </Badge>
        )
      } else {
        return (
          <Button size="sm" variant="outline" disabled={receiving === box.id} onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('receive'); }} className="h-7 w-[76px] gap-1 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-50 shrink-0">
            {receiving === box.id ? '...' : 'Receive'}
          </Button>
        )
      }
    }
    
    if (stage === 'inventory') {
      const latestSession = box.box_sessions?.[0]
      const status = latestSession?.status || 'sent'
      
      if (status === 'received') {
        return (
          <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50 shrink-0 flex items-center justify-center w-[76px] h-7 cursor-default">
            Received
          </Badge>
        )
      } else if (status === 'sent') {
        return (
          <div className="group/action relative flex items-center justify-end w-[76px] h-7 shrink-0 rounded-md cursor-pointer overflow-hidden">
            <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-700 bg-indigo-50 transition-all duration-300 group-hover/action:-translate-x-full group-hover/action:opacity-0 cursor-default flex items-center justify-center w-full h-full text-center">
              Sent
            </Badge>
            <Button size="sm" variant="outline" disabled={advancing === box.id} onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('advance'); }} className="absolute inset-y-0 right-0 h-full w-full px-0 gap-1 text-xs border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 opacity-0 translate-x-full group-hover/action:translate-x-0 group-hover/action:opacity-100 pointer-events-none group-hover/action:pointer-events-auto transition-all duration-300">
              {advancing === box.id ? '...' : 'Receive'}
            </Button>
          </div>
        )
      } else {
        return (
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0 flex items-center justify-center w-[76px] h-7 cursor-default">
            {status === 'completed' ? 'Complete' : status}
          </Badge>
        )
      }
    }
    
    if (stage === 'cut') {
      const latestSession = box.box_sessions?.[0]
      const status = latestSession?.status || 'sent'
      
      if (status === 'received') {
        return (
          <div className="group/action relative flex items-center justify-end w-[76px] h-7 shrink-0 rounded-md cursor-pointer overflow-hidden">
            <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50 transition-all duration-300 group-hover/action:-translate-x-full group-hover/action:opacity-0 cursor-default flex items-center justify-center w-full h-full text-center">
              Received
            </Badge>
            <Button size="sm" variant="default" disabled={sendingForward === box.id} onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('send_forward'); }} className="absolute inset-y-0 right-0 h-full w-full px-0 gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 opacity-0 translate-x-full group-hover/action:translate-x-0 group-hover/action:opacity-100 pointer-events-none group-hover/action:pointer-events-auto transition-all duration-300">
              {sendingForward === box.id ? '...' : 'Send'}
              {sendingForward !== box.id && <ArrowRight className="h-3 w-3" />}
            </Button>
          </div>
        )
      } else if (status === 'sent') {
        return (
          <div className="group/action relative flex items-center justify-end w-[76px] h-7 shrink-0 rounded-md cursor-pointer overflow-hidden">
            <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-700 bg-indigo-50 transition-all duration-300 group-hover/action:-translate-x-full group-hover/action:opacity-0 cursor-default flex items-center justify-center w-full h-full text-center">
              Sent
            </Badge>
            <Button size="sm" variant="outline" disabled={advancing === box.id} onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('advance'); }} className="absolute inset-y-0 right-0 h-full w-full px-0 gap-1 text-xs border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 opacity-0 translate-x-full group-hover/action:translate-x-0 group-hover/action:opacity-100 pointer-events-none group-hover/action:pointer-events-auto transition-all duration-300">
              {advancing === box.id ? '...' : 'Receive'}
            </Button>
          </div>
        )
      } else {
        return (
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0 flex items-center justify-center w-[76px] h-7 cursor-default">
            {status === 'completed' ? 'Complete' : status}
          </Badge>
        )
      }
    }
    
    if (stage === 'endorsement') {
      const latestSession = box.box_sessions?.[0]
      const status = latestSession?.status || 'sent'
      
      if (status === 'received') {
        return (
          <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50 shrink-0 flex items-center justify-center w-[76px] h-7 cursor-default">
            Received
          </Badge>
        )
      } else if (status === 'completed') {
        return (
          <div className="group/action relative flex items-center justify-end w-[76px] h-7 shrink-0 rounded-md cursor-pointer overflow-hidden">
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 transition-all duration-300 group-hover/action:-translate-x-full group-hover/action:opacity-0 cursor-default flex items-center justify-center w-full h-full text-center">
              Complete
            </Badge>
            <Button size="sm" variant="default" disabled={sendingForward === box.id} onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('send_forward'); }} className="absolute inset-y-0 right-0 h-full w-full px-0 gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 opacity-0 translate-x-full group-hover/action:translate-x-0 group-hover/action:opacity-100 pointer-events-none group-hover/action:pointer-events-auto transition-all duration-300">
              {sendingForward === box.id ? '...' : 'Send'}
              {sendingForward !== box.id && <ArrowRight className="h-3 w-3" />}
            </Button>
          </div>
        )
      } else if (status === 'sent') {
        return (
          <div className="group/action relative flex items-center justify-end w-[76px] h-7 shrink-0 rounded-md cursor-pointer overflow-hidden">
            <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-700 bg-indigo-50 transition-all duration-300 group-hover/action:-translate-x-full group-hover/action:opacity-0 cursor-default flex items-center justify-center w-full h-full text-center">
              Sent
            </Badge>
            <Button size="sm" variant="outline" disabled={advancing === box.id} onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('advance'); }} className="absolute inset-y-0 right-0 h-full w-full px-0 gap-1 text-xs border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 opacity-0 translate-x-full group-hover/action:translate-x-0 group-hover/action:opacity-100 pointer-events-none group-hover/action:pointer-events-auto transition-all duration-300">
              {advancing === box.id ? '...' : 'Receive'}
            </Button>
          </div>
        )
      } else {
        return (
          <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-700 bg-gray-50 shrink-0 flex items-center justify-center w-[76px] h-7 cursor-default">
            {status}
          </Badge>
        )
      }
    }
    if (stage === 'scan') {
      if (selectedStage === 'storage') {
        return (
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0 flex items-center justify-center h-7 px-2 cursor-default">
            Done
          </Badge>
        )
      }
      return (
        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50 shrink-0 flex items-center justify-center h-7 px-2 cursor-default">
          {checkingSimflexBoxId === box.id ? 'Checking...' : 'Pending'}
        </Badge>
      )
    }
    if (stage === 'transmit') {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={advancing === box.id}
          onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('advance'); }}
          className="h-7 gap-1 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 shrink-0"
        >
          {advancing === box.id ? '...' : 'Send'}
          {advancing !== box.id && <ArrowRight className="h-3 w-3" />}
        </Button>
      )
    }
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={receiving === box.id}
        onClick={(e) => { e.stopPropagation(); setConfirmBox(box); setConfirmActionType('receive'); }}
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
        toast.error(data.error || 'Simflex check failed')
        return
      }
      setSimflexCheckResult({
        boxId: box.id,
        message: data.message || (data.autoAdvanced ? 'Box fully completed and advanced to Storage!' : 'Not all books are completed yet.'),
        success: true,
        autoAdvanced: data.autoAdvanced
      })
      if (data.autoAdvanced) {
        toast.success('Box fully completed and advanced to Storage!')
        await fetchData()
      } else {
        toast.error('Cannot advance: Not all processable books are completed.')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Simflex check failed'
      setSimflexCheckResult({ boxId: box.id, message: msg, success: false })
      toast.error(msg)
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

      if ((box.current_stage === 'scan') && books.length > 0) {
        const processableIsbns = [...new Set(books.filter(b => b.scan_status === 'processable').map(b => b.isbn))]
        if (processableIsbns.length > 0) {
          details.loadingSimflex = true
          setStageBoxDetails(prev => ({ ...prev, [box.id]: { ...details, loadingSimflex: true } }))
          try {
            // Disabled Simflex check for now based on request
            // const simRes = await authFetch(`${API_URL}/api/scanning/simflex-status?isbns=${processableIsbns.join(',')}&location=${brand}`)
            // const simData = await simRes.json()
            // if (simData.success && simData.statuses) {
            //   details.simflex = simData.statuses
            // }
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
        return b.current_stage === 'scan' && !b.is_fully_completed_in_simflex
      }
      if (stage === 'storage') {
        const isActuallyStorage = b.current_stage === 'storage'
        const isScanButFullyCompleted = b.current_stage === 'scan' && b.is_fully_completed_in_simflex
        return isActuallyStorage || isScanButFullyCompleted
      }
      if (stage === 'scan') {
        return b.current_stage === 'scan' && !b.is_fully_completed_in_simflex
      }
      return b.current_stage === stage
    })
    if (stage === 'warehouse') {
      stageBoxes = stageBoxes.filter(b => b.total_expected_books > 0)
    }
    acc[stage] = stageBoxes
    return acc
  }, {} as Record<Stage, BoxItem[]>)

  const parseDateLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Filter and pagination for transitions log is now handled SERVER-SIDE
  const filteredTransitions = transitions
  const paginatedTransitions = transitions

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const STAGE_LABELS: Record<string, string> = {
    warehouse: 'Warehouse', inventory: 'Inventory', cut: 'Cut',
    endorsement: 'Endorsement', scan: 'Scan', storage: 'Storage'
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
        <div className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">

            {/* Box Details Modal */}
            {(scannedBox || loadingScannedBox) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setScannedBox(null)}>
                <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{scannedBox?.box.box_number}</h3>
                      <p className="text-xs text-muted-foreground">
                        {scannedBox?.box.lot?.lot_number} ┬╖ <span className="capitalize">{scannedBox?.box.current_stage}</span> ┬╖ {scannedBox?.box.total_expected_books} books
                      </p>
                    </div>
                    <button onClick={() => setScannedBox(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
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
                        {checkingSimflexBoxId === scannedBox.box.id ? 'Checking Simflex…' : 'Check Simflex'}
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
                                <td className="py-1.5 pr-3 max-w-[220px] truncate text-foreground">{book.title || '—'}</td>
                                <td className="py-1.5 pr-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : book.scan_status === 'non_processable' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {book.scan_status === 'processable' ? 'Processable' : book.scan_status === 'non_processable' ? 'Non-Processable' : book.scan_status}
                                  </span>
                                </td>
                                <td className="py-1.5 pr-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize bg-gray-100 text-gray-700">
                                    {scannedBox?.box.current_stage || '—'}
                                  </span>
                                </td>
                                {(scannedBox?.box.current_stage === 'scan' || scannedBox?.box.current_stage === 'transmit') && (
                                  <td className="py-1.5">
                                    {book.scan_status !== 'processable' ? (
                                      <span className="text-[10px] text-muted-foreground">—</span>
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
            {confirmBox && confirmActionType && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
                <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4">
                  <h3 className="text-base font-semibold text-foreground mb-4">
                    {confirmActionType === 'receive' ? 'Confirm Receive' : 
                     confirmActionType === 'send_forward' ? 'Confirm Send/Complete' : 
                     'Confirm Move'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    {confirmActionType === 'receive' ? (
                      <>Receive <span className="font-semibold text-foreground">{confirmBox.box_number}</span> at {STAGE_META[confirmBox.current_stage]?.label}?</>
                    ) : confirmActionType === 'send_forward' ? (
                      <>Mark <span className="font-semibold text-foreground">{confirmBox.box_number}</span> as completed/sent?</>
                    ) : (
                      <>Move <span className="font-semibold text-foreground">{confirmBox.box_number}</span> from</>
                    )}
                  </p>
                  
                  {/* Visual Guide for ALL Actions */}
                  <div className="flex items-center gap-2 mb-4 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      confirmActionType === 'receive' 
                        ? STAGE_META[STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) - 1]]?.color || 'bg-gray-100'
                        : STAGE_META[confirmBox.current_stage]?.color
                    }`}>
                      {confirmActionType === 'receive' 
                        ? (STAGE_META[STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) - 1]]?.label || 'Previous')
                        : STAGE_META[confirmBox.current_stage]?.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      confirmActionType === 'receive'
                        ? STAGE_META[confirmBox.current_stage]?.color
                        : confirmActionType === 'send_forward'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : STAGE_META[confirmBox.current_stage === 'scan' ? 'storage' : STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) + 1]]?.color
                    }`}>
                      {confirmActionType === 'receive'
                        ? STAGE_META[confirmBox.current_stage]?.label
                        : confirmActionType === 'send_forward'
                        ? 'Sent'
                        : STAGE_META[confirmBox.current_stage === 'scan' ? 'storage' : STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) + 1]]?.label}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4 mt-2">
                    {confirmActionType === 'advance' ? 'Make sure the box has physically arrived at the next station before confirming.' : 
                     confirmActionType === 'receive' ? 'Make sure you have physically received the box.' : 
                     'Are you sure you want to finalize this step?'}
                  </p>
                  
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setConfirmBox(null); setConfirmActionType(null); }} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={() => {
                      if (confirmActionType === 'receive') handleReceive(confirmBox);
                      else if (confirmActionType === 'send_forward') handleSendForward(confirmBox);
                      else doAdvance(confirmBox);
                      setConfirmBox(null);
                      setConfirmActionType(null);
                    }} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">Yes, Confirm</button>
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
                const filteredSimflex = simflexRows.filter(row => {
                    const q = simflexRowsSearch.toLowerCase().trim()
                    return !q ||
                        row.ISBN?.toLowerCase().includes(q) ||
                        row.BoxNumber?.toLowerCase().includes(q) ||
                        row.LotNumber?.toLowerCase().includes(q) ||
                        row.ScanUser?.toLowerCase().includes(q)
                })
                const totalItems = selectedStage === 'transmit' || selectedStage === 'scan' && (simflexRows.length > 0) ? filteredSimflex.length : filteredBoxes.length
                const borderClass = meta.color.split(' ').find(c => c.startsWith('border-')) || 'border-gray-300'
                const textClass = meta.color.split(' ').find(c => c.startsWith('text-')) || 'text-gray-700'
                const StageIcon = meta.icon
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedStage(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-6xl mx-4 h-[700px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      {/* Header */}
                      <div className={cn("flex items-center justify-between px-6 py-5 border-b border-border/50", brand === 'jaguar' ? "bg-gradient-to-r from-green-50/50 to-transparent" : "bg-gradient-to-r from-blue-50/50 to-transparent")}>
                        <div className="flex items-center gap-4">
                          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", meta.color)}>
                            <StageIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{meta.label}</h3>
                            <p className="text-xs text-muted-foreground">
                             {selectedStage === 'transmit'
                               ? `${simflexRowsLoading ? '…' : simflexRows.length} book${simflexRows.length === 1 ? '' : 's'} transmitting`
                               : `${stageBoxes.length} ${stageBoxes.length === 1 ? 'box' : 'boxes'} waiting`
                             }
                           </p>

                          </div>
                        </div>
                        <button onClick={() => setSelectedStage(null)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Search */}
                      <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder={selectedStage === 'scan' || selectedStage === 'transmit' ? 'Search ISBN, box, or user…' : 'Search box number or lot...'}
                            value={selectedStage === 'scan' || selectedStage === 'transmit' ? simflexRowsSearch : stageModalSearch}
                            onChange={e => {
                              if (selectedStage === 'scan' || selectedStage === 'transmit') {
                                setSimflexRowsSearch(e.target.value)
                              } else {
                                setStageModalSearch(e.target.value)
                              }
                              setStageModalPage(1)
                            }}
                            className="pl-10 h-11 bg-background border-border/50 focus-visible:border-primary focus-visible:ring-1 hover:border-border transition-colors rounded-xl shadow-sm text-sm"
                          />
                        </div>
                      </div>

                      {/* Box list for all stages */}
                      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                          {filteredBoxes.length === 0 && selectedStage !== 'transmit' ? (
                            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                              {stageModalSearch ? 'No matching boxes found.' : 'No boxes at this station.'}
                            </div>
                          ) : selectedStage === 'transmit' ? (
                            <div className="flex flex-col gap-2">
                              {simflexRowsLoading ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">Loading books...</div>
                              ) : filteredSimflex.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                                  {simflexRowsSearch ? 'No matching books found.' : 'No books currently in transmission.'}
                                </div>
                              ) : (
                                filteredSimflex
                                .slice((stageModalPage - 1) * 50, stageModalPage * 50)
                                .map((row, idx) => (
                                  <div key={idx} className="rounded-xl border border-border/70 bg-card p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                      <div className="flex flex-col">
                                        <span className="font-mono font-bold text-foreground text-sm">{row.ISBN}</span>
                                        <span className="text-xs text-muted-foreground mt-1">
                                          Box: <span className="font-semibold text-foreground">{row.BoxNumber || 'N/A'}</span>
                                          {row.LotNumber && <> • <span className="font-semibold text-foreground">{row.LotNumber}</span></>}
                                          {row.ScanUser && <> • User: <span className="font-semibold text-foreground">{row.ScanUser}</span></>}
                                        </span>
                                        {row.Title && (
                                          <span className="text-xs text-muted-foreground mt-0.5 max-w-[340px] truncate" title={row.Title}>{row.Title}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1.5">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                                        Ongoing
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        Simflex: {row.Status || 'Transmission_Archive ONGOING'}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {filteredBoxes.slice((stageModalPage - 1) * 50, stageModalPage * 50).map(box => {
                                  const isExpanded = expandedStageBoxId === box.id
                                  const details = stageBoxDetails[box.id]
                                  const latestTransition = transitions.find(t => t.box?.box_number === box.box_number && t.to_stage === box.current_stage)
                                  
                                  const stage = box.current_stage
                                  const session = box.box_sessions?.[0]
                                  const sessionStatus = session?.status || 'pending'

                                  let actionLabel = 'Received'
                                  let byName = latestTransition?.moved_by_name || 'N/A'
                                  let timeStr = latestTransition?.created_at || null

                                  if (stage === 'warehouse') {
                                    if (sessionStatus === 'completed') {
                                      actionLabel = 'Processed'
                                      byName = (session as any)?.warehouse_received_profile?.name || byName
                                      timeStr = session?.updated_at || timeStr
                                    } else if (sessionStatus === 'received') {
                                      actionLabel = 'Received'
                                      byName = (session as any)?.warehouse_received_profile?.name || byName
                                      timeStr = session?.warehouse_time_received || timeStr
                                    } else if (sessionStatus === 'sent') {
                                      actionLabel = 'Sent'
                                      byName = (session as any)?.warehouse_received_profile?.name || byName
                                      timeStr = session?.updated_at || timeStr
                                    }
                                  } else if (stage === 'inventory') {
                                    if (sessionStatus === 'completed') {
                                      actionLabel = 'Processed'
                                      byName = (session as any)?.inventory_send_profile?.name || byName
                                      timeStr = session?.inventory_time_send || timeStr
                                    } else if (sessionStatus === 'received') {
                                      actionLabel = 'Received'
                                      byName = (session as any)?.inventory_received_profile?.name || byName
                                      timeStr = session?.inventory_time_received || timeStr
                                    } else if (sessionStatus === 'sent') {
                                      actionLabel = 'Sent'
                                      byName = (session as any)?.inventory_send_profile?.name || byName
                                      timeStr = session?.inventory_time_send || timeStr
                                    }
                                    if (byName === 'N/A' && (box as any).latest_inventory_scan_by_name) {
                                      byName = (box as any).latest_inventory_scan_by_name
                                      timeStr = (box as any).latest_inventory_scan_at || timeStr
                                    }
                                  } else if (stage === 'cut') {
                                    if (sessionStatus === 'completed') {
                                      actionLabel = 'Processed'
                                      byName = (session as any)?.cut_send_profile?.name || byName
                                      timeStr = session?.cut_time_send || timeStr
                                    } else if (sessionStatus === 'received') {
                                      actionLabel = 'Received'
                                      byName = (session as any)?.cut_received_profile?.name || byName
                                      timeStr = session?.cut_time_received || timeStr
                                    } else if (sessionStatus === 'sent') {
                                      actionLabel = 'Sent'
                                      byName = (session as any)?.cut_send_profile?.name || byName
                                      timeStr = session?.cut_time_send || timeStr
                                    }
                                  } else if (stage === 'endorsement') {
                                    if (sessionStatus === 'completed') {
                                      actionLabel = 'Processed'
                                      byName = (session as any)?.endorsement_send_profile?.name || byName
                                      timeStr = session?.endorsement_time_send || timeStr
                                    } else if (sessionStatus === 'received') {
                                      actionLabel = 'Received'
                                      byName = (session as any)?.endorsement_received_profile?.name || byName
                                      timeStr = session?.endorsement_time_received || timeStr
                                    } else if (sessionStatus === 'sent') {
                                      actionLabel = 'Sent'
                                      byName = (session as any)?.endorsement_send_profile?.name || byName
                                      timeStr = session?.endorsement_time_send || timeStr
                                    }
                                    if (byName === 'N/A' && (box as any).latest_endorsement_scan_by_name) {
                                      byName = (box as any).latest_endorsement_scan_by_name
                                      timeStr = (box as any).latest_endorsement_scan_at || timeStr
                                    }
                                  } else if (stage === 'scan') {
                                    actionLabel = 'Scanned'
                                    byName = (session as any)?.scan_received_profile?.name || byName
                                    timeStr = session?.scan_time_received || timeStr
                                  } else if (stage === 'storage') {
                                    actionLabel = 'Completed'
                                  }

                                  const relevantTime = getRelevantTimeForBox(box, stage)
                                  const parsedTime = relevantTime ? new Date(relevantTime).getTime() : 0
                                  const diffDays = parsedTime ? (Date.now() - parsedTime) / (1000 * 60 * 60 * 24) : 0
                                  const isDelayed = diffDays >= 1
                                  
                                  const rowBg = isDelayed ? "bg-orange-50/50" : (brand === 'jaguar' ? "bg-green-50/30" : "bg-blue-50/30")
                                  const rowBorder = isDelayed ? "border-orange-300 hover:border-orange-400" : (brand === 'jaguar' ? "border-green-300 hover:border-green-400" : "border-blue-300 hover:border-blue-400")
                                  const rowHoverBg = isDelayed ? "hover:bg-orange-50" : (brand === 'jaguar' ? "hover:bg-green-50" : "hover:bg-blue-50")

                                  return (
                                    <div
                                      key={box.id}
                                      id={`box-${box.id}`}
                                      className={cn(
                                        "rounded-lg border overflow-hidden transition-all",
                                        rowBg, rowBorder,
                                        highlightBox === box.id && 'ring-2 ring-primary',
                                        isExpanded && "shadow-md"
                                      )}
                                    >
                                      <div 
                                        className={cn("flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 cursor-pointer group transition-colors gap-3", rowHoverBg)}
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
                                            <div className="flex items-center gap-2">
                                              <p className={cn("text-sm font-bold truncate", isDelayed ? "text-orange-900" : "text-foreground")}>
                                                BOX: {box.box_number}
                                              </p>
                                              {isDelayed && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-600 border border-orange-200 shadow-sm">
                                                  Delayed
                                                </span>
                                              )}
                                            </div>
                                            <p className={cn("text-xs truncate mt-0.5", isDelayed ? "text-orange-700/80" : "text-muted-foreground")}>
                                              {box.lot?.lot_number || 'N/A'}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Middle section: Book numbers, Station, Received By */}
                                        <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-6 text-left shrink-0">
                                          <div className="min-w-[80px]">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Books</span>
                                            <span className="text-xs font-semibold text-foreground">
                                              {box.box_sessions?.[0]?.total_accepted_books ?? 0} / {box.total_expected_books ?? 0}
                                            </span>
                                          </div>

                                          {selectedStage !== 'scan' && actionLabel !== 'Scanned' && selectedStage !== 'storage' && actionLabel !== 'Completed' && (
                                            <div className="min-w-[130px] col-span-1">
                                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">{actionLabel} By</span>
                                              <span className="text-xs font-semibold text-foreground truncate block max-w-[120px]" title={byName}>
                                                {byName}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Right side: Timestamp & Action */}
                                        <div className="flex items-center gap-4 ml-auto pl-4">
                                          {selectedStage !== 'scan' && actionLabel !== 'Scanned' && selectedStage !== 'storage' && actionLabel !== 'Completed' && (
                                            <div className="text-left sm:text-right shrink-0 min-w-[100px]">
                                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">{actionLabel} At</span>
                                              <span className="text-xs font-semibold text-muted-foreground">
                                                {timeStr
                                                  ? new Date(timeStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                                  : 'N/A'}
                                              </span>
                                            </div>
                                          )}
                                          <div className="shrink-0 flex items-center justify-end border-l border-border/50 pl-4">
                                            {renderBoxAction(box)}
                                          </div>
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
                                                <tr className="text-muted-foreground border-b border-border grid grid-cols-[110px_minmax(0,1fr)_380px] gap-3 w-full">
                                                  <th className="pb-2 text-left font-medium">ISBN</th>
                                                  <th className="pb-2 text-left font-medium">Title</th>
                                                  <th className="pb-2 text-left font-medium">Status</th>
                                                </tr>
                                              </thead>
                                              <tbody className="block w-full">
                                                {details.books.map((book) => {
                                                    const rawStatus = details.simflex?.[book.isbn] || book.transmission_status;
                                                    const simflexStatus = typeof rawStatus === 'string' ? rawStatus : (rawStatus?.latestStatus || 'Pending');
                                                    const isTransmissionCompleted = simflexStatus === 'COMPLETED' || simflexStatus === 'Transmission_Archive COMPLETED';
                                                    return (
                                                  <tr key={book.id} className="border-b border-border/40 last:border-0 grid grid-cols-[110px_minmax(0,1fr)_380px] gap-3 w-full items-start">
                                                    <td className="py-1.5 text-foreground font-mono tabular-nums truncate" title={book.isbn}>
                                                      {book.isbn}
                                                    </td>
                                                    <td className="py-1.5 text-foreground leading-tight truncate min-w-0" title={book.title || undefined}>
                                                      {book.title || 'N/A'}
                                                    </td>
                                                    <td className="py-1.5 flex flex-row items-center justify-start gap-2 text-left overflow-hidden">
                                                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' :
                                                      book.scan_status === 'non_processable' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {book.scan_status === 'processable' ? 'Processable' : book.scan_status === 'non_processable' ? 'Non-Processable' : book.scan_status}
                                                      </span>
                                                      {(selectedStage === 'scan' || selectedStage === 'storage') && (
                                                        <span className="text-[9px] text-muted-foreground font-normal truncate" title={`Simflex: ${book.scan_status === 'non_processable' ? 'Not Included' : formatSimflexStatus(simflexStatus)}`}>
                                                          Simflex: {book.scan_status === 'non_processable' ? 'Not Included' : formatSimflexStatus(simflexStatus)}
                                                        </span>
                                                      )}
                                                      {book.scan_status === 'non_processable' && book.flag?.issue && (
                                                        <span className="text-[9px] text-red-500 font-normal opacity-90 truncate" title={`Reason: ${book.flag.issue}`}>
                                                          Reason: {book.flag.issue}
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
                      <div className="border-t border-border/50 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground rounded-b-xl flex-wrap">
                        {(() => {
                          let totalItems = filteredBoxes.length;
                          if (selectedStage === 'transmit') {
                            const q = simflexRowsSearch.toLowerCase().trim();
                            totalItems = simflexRows.filter(row => !q || row.ISBN?.toLowerCase().includes(q) || row.BoxNumber?.toLowerCase().includes(q) || row.LotNumber?.toLowerCase().includes(q) || row.ScanUser?.toLowerCase().includes(q)).length;
                          }
                          const totalPages = Math.max(1, Math.ceil(totalItems / 50));
                          
                          return (
                            <div className="w-full flex items-center justify-between p-4">
                              <span className="font-medium shrink-0">{totalItems} {totalItems === 1 ? 'entry' : 'entries'} shown</span>
                              {totalItems > 0 && (
                                <div className="scale-90 origin-right">
                                  <Pagination
                                    currentPage={stageModalPage}
                                    totalPages={totalPages}
                                    pageSize={50}
                                    onPageChange={setStageModalPage}
                                    canPrevPage={stageModalPage > 1}
                                    canNextPage={stageModalPage < totalPages}
                                    showPageInfo={false}
                                  />
                                </div>
                              )}
                              <Button variant="outline" size="sm" onClick={() => setSelectedStage(null)} className="rounded-lg shadow-sm border-border/50 hover:bg-muted/50 font-medium ml-4">Close</Button>
                            </div>
                          )
                        })()}
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
                <button onClick={() => { setUndoEntry(null); if (undoTimer.current) clearTimeout(undoTimer.current) }} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            )}

            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                  <MapPin className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
                    Station Monitor
                  </h1>
                  <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                    Live pipeline tracking for <span className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none", brand === 'jaguar' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600')}>{brand}</span>
                  </p>
                </div>
              </div>
              <RefreshControl onRefresh={() => fetchData()} refreshing={topLoading || transitionsLoading} lastUpdated={lastUpdated} storageKey="checkpoints" className="hidden sm:flex" />
            </header>

            {/* Pipeline Stage Flow */}
            <div className="relative mt-2 mb-8">
              {/* Continuous connecting line */}
              <div className="hidden lg:block absolute top-[20px] left-[7%] right-[7%] h-[3px] bg-border/40 rounded-full z-0" />
              
              {/* Desktop perfectly aligned headers */}
              <div className="hidden lg:grid grid-cols-7 gap-3 relative z-10">
                {STAGE_ORDER.map((stage) => {
                  const meta = STAGE_META[stage]
                  const count = stage === 'transmit' ? (transmitBooks ?? 0) : (boxesByStage[stage]?.length || 0)
                  
                  // Extract colors from meta.color (e.g. 'bg-indigo-100 text-indigo-700 border-indigo-300')
                  const bgClass = meta.color.match(/bg-\w+-100/)?.[0] || 'bg-gray-100'
                  const solidBgClass = meta.solidBg
                  const textClass = meta.color.match(/text-\w+-700/)?.[0] || 'text-gray-700'
                  const borderClass = meta.color.match(/border-\w+-300/)?.[0] || 'border-gray-300'
                  
                  return (
                    <div key={stage} className="flex flex-col items-center justify-center gap-2 group cursor-default">
                      {/* Node Circle */}
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border-2 bg-background transition-transform duration-300 group-hover:scale-110 shadow-sm relative",
                        borderClass, textClass
                      )}>
                        <meta.icon className="h-4 w-4" />
                        {/* Count Badge overlay */}
                        {count > 0 && (
                          <div className={cn(
                            "absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-background shadow-sm",
                            solidBgClass
                          )}>
                            {count}
                          </div>
                        )}
                      </div>
                      
                      {/* Label below node */}
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              
              {/* Mobile wrapping headers */}
              <div className="flex lg:hidden flex-col gap-3 py-2">
                 <div className="flex items-center gap-2 flex-wrap">
                   {STAGE_ORDER.map((stage, i) => {
                     const meta = STAGE_META[stage]
                     const count = stage === 'transmit' ? (transmitBooks ?? 0) : (boxesByStage[stage]?.length || 0)
                     
                     const bgClass = meta.color.match(/bg-\w+-100/)?.[0] || 'bg-gray-100'
                     const solidBgClass = meta.solidBg
                     const textClass = meta.color.match(/text-\w+-700/)?.[0] || 'text-gray-700'
                     const borderClass = meta.color.match(/border-\w+-300/)?.[0] || 'border-gray-300'
                     
                     return (
                       <div key={stage} className="flex items-center gap-2">
                         <div className={cn(
                           "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 bg-background shadow-sm",
                           borderClass, textClass
                         )}>
                           <meta.icon className="h-3.5 w-3.5" />
                           {meta.label}
                           {count > 0 && (
                             <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[10px] text-white", solidBgClass)}>
                               {count}
                             </span>
                           )}
                         </div>
                         {i < STAGE_ORDER.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                       </div>
                     )
                   })}
                 </div>
              </div>
            </div>


            {/* Station Cards Grid */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative">
              {topLoading && <PageLoader />}
                {/* Desktop: 7 inline columns */}
                <div className="hidden lg:flex items-stretch gap-3">
                  {STAGE_ORDER.map((stage) => {
                    const meta = STAGE_META[stage]
                    const stageBoxes = boxesByStage[stage]
                    
                    const bottleneckCount = (stage === 'transmit') ? 0 : stageBoxes.filter(b => {
                      const relevantTime = getRelevantTimeForBox(b, stage)
                      if (!relevantTime) return false
                      const diffDays = (Date.now() - new Date(relevantTime).getTime()) / (1000 * 60 * 60 * 24)
                      return diffDays >= 1
                    }).length
                    
                    // For Transmit: use DB-validated book count so card matches modal
                    const totalCount = stage === 'transmit' ? (transmitBooks ?? 0) : stageBoxes.length
                    // If it's transmit, we are showing books, so we don't subtract delayed boxes from books.
                    // Otherwise, subtract delayed boxes to get active boxes.
                    const activeCount = stage === 'transmit' ? totalCount : Math.max(0, totalCount - bottleneckCount)
                    
                    const status = getStepStatus(totalCount)
                    const cfg = getStatusConfig(status, brand)

                    return (
                      <div
                        key={stage}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedStage(stage); setStageModalSearch('') }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setSelectedStage(stage); setStageModalSearch('') }}}
                        className={cn(
                          "flex-1 min-w-0 rounded-xl border border-border bg-card shadow-xs p-3.5 flex flex-col cursor-pointer transition-all duration-200 hover:shadow-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/30 select-none relative overflow-hidden"
                        )}
                      >
                        <div className={cn("absolute top-0 left-0 right-0 h-1", cfg.borderGradient)} />
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border shrink-0", cfg.iconColorCls)}>
                            <meta.icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={cn("text-2xl font-black leading-none truncate tracking-tight", cfg.countColor)} title={stage === 'transmit' ? `${totalCount} total books` : `${totalCount} total boxes`}>
                              {activeCount}
                            </span>
                            {bottleneckCount > 0 && (
                              <div className="flex items-center gap-1 bg-orange-100/50 px-1.5 py-0.5 rounded border border-orange-200/50" title={`${bottleneckCount} boxes delayed > 1 day`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-bold leading-none text-orange-600">
                                  {bottleneckCount} delayed
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <h3 className="text-xs font-bold text-card-foreground mt-auto truncate" title={meta.label}>
                          {meta.label}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
                          </div>
                          {bottleneckCount > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                              <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wide">Delayed</span>
                            </div>
                          )}
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
                    
                    const bottleneckCount = (stage === 'transmit') ? 0 : stageBoxes.filter(b => {
                      const relevantTime = getRelevantTimeForBox(b, stage)
                      if (!relevantTime) return false
                      const diffDays = (Date.now() - new Date(relevantTime).getTime()) / (1000 * 60 * 60 * 24)
                      return diffDays >= 1
                    }).length
                    
                    // For Transmit: use DB-validated book count so card matches modal
                    const totalCount = stage === 'transmit' ? (transmitBooks ?? 0) : stageBoxes.length
                    const activeCount = stage === 'transmit' ? totalCount : Math.max(0, totalCount - bottleneckCount)
                    
                    const status = getStepStatus(totalCount)
                    const cfg = getStatusConfig(status, brand)

                    return (
                      <div
                        key={stage}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedStage(stage); setStageModalSearch('') }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setSelectedStage(stage); setStageModalSearch('') }}}
                        className={cn(
                          "rounded-xl border border-border bg-card shadow-xs p-3.5 flex flex-col cursor-pointer transition-all duration-200 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/30 select-none relative overflow-hidden"
                        )}
                      >
                        <div className={cn("absolute top-0 left-0 right-0 h-1", cfg.borderGradient)} />
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border shrink-0", cfg.iconColorCls)}>
                            <meta.icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={cn("text-2xl font-black leading-none truncate tracking-tight", cfg.countColor)} title={stage === 'transmit' ? `${totalCount} books` : `${totalCount} boxes`}>
                              {activeCount}
                            </span>
                            {bottleneckCount > 0 && (
                              <div className="flex items-center gap-1 bg-orange-100/50 px-1.5 py-0.5 rounded border border-orange-200/50" title={`${bottleneckCount} boxes delayed > 1 day`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-bold leading-none text-orange-600">
                                  {bottleneckCount} delayed
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <h3 className="text-xs font-bold text-card-foreground mt-auto truncate" title={meta.label}>
                          {meta.label}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
                          </div>
                          {bottleneckCount > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                              <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wide">Delayed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Status Legend */}
                <div className="flex items-center gap-4 text-xs mt-4 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", brand === 'jaguar' ? "bg-green-400" : "bg-blue-400")} />
                    <span className="text-xs text-muted-foreground">Active (Moving normally)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="text-xs text-muted-foreground">Delayed (Stuck &gt; 24h)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-xs text-muted-foreground">Idle</span>
                  </div>
                </div>
              </div>

            {/* Pipeline Transition Logs */}
            <Card className="border-border/50 bg-card overflow-hidden py-0 gap-0 shadow-xl shadow-black/[0.03] ring-1 ring-black/5 rounded-2xl">
              <div className={cn("flex items-center justify-between px-6 py-5 border-b border-border/50", brand === 'jaguar' ? "bg-gradient-to-r from-green-50/50 to-transparent" : "bg-gradient-to-r from-blue-50/50 to-transparent")}>
                <div className="flex items-center gap-4">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm", brand === 'jaguar' ? "bg-green-500" : "bg-blue-500")}>
                    <Scan className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground tracking-tight">Box Pipeline Tracker</h2>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Showing page {transitionsPagination.currentPage} of {Math.max(1, transitionsPagination.totalPages)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex flex-col md:flex-row gap-4 items-end">
                {/* Search */}
                <div className="relative flex-1 w-full md:min-w-[250px]">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search box or lot (Press Enter)"
                      value={transitionSearchInput}
                      onChange={e => setTransitionSearchInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setTransitionSearch(transitionSearchInput)
                          transitionsPagination.goToPage(1)
                        }
                      }}
                      className="pl-9 h-10 bg-background border-border/50 focus-visible:border-primary focus-visible:ring-1 hover:border-border transition-colors rounded-xl shadow-sm"
                    />
                  </div>
                </div>

                {/* Stage */}
                <div className="w-full md:w-[180px]">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Stage</label>
                  <Select value={transitionStageFilter || 'all'} onValueChange={v => setTransitionStageFilter(v === 'all' ? '' : v as Stage)}>
                    <SelectTrigger className="h-10 bg-background border-border/50 focus:ring-1 focus:ring-primary rounded-xl shadow-sm hover:border-border transition-colors">
                      <SelectValue placeholder="All stages" />
                    </SelectTrigger>  
                    <SelectContent>
                      <SelectItem value="all">All stages</SelectItem>
                      {STAGE_ORDER.filter(s => s !== 'transmit').map(stage => (
                        <SelectItem key={stage} value={stage}>{STAGE_META[stage].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-full md:w-[140px]">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date From</label>
                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal text-sm bg-background border-border/50 hover:bg-muted/50 hover:text-foreground rounded-xl shadow-sm group transition-all", !transitionDateFrom && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          {transitionDateFrom ? format(new Date(transitionDateFrom), 'MMM dd, yyyy') : 'Start date'}
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
                  
                  <div className="w-full md:w-[140px]">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date To</label>
                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal text-sm bg-background border-border/50 hover:bg-muted/50 hover:text-foreground rounded-xl shadow-sm group transition-all", !transitionDateTo && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          {transitionDateTo ? format(new Date(transitionDateTo), 'MMM dd, yyyy') : 'End date'}
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
              </div>

              <CardContent className="p-0 relative">
                {transitionsLoading && <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center min-h-[100px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                {transitions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No transitions logged yet. Use "Receive" buttons above to advance boxes.
                  </div>
                ) : filteredTransitions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No transitions match your search or date filters.
                  </div>
                ) : (
                  <div className="flex flex-col border-t border-border/50 max-h-[600px] overflow-y-auto overflow-x-hidden relative">
                    {/* Column Headers */}
                    <div className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-20 shadow-sm">
                      <div className="w-[220px] shrink-0 flex items-center">
                        <div className="w-[80px] shrink-0 mr-2">Box & Lot</div>
                        <div className="w-[130px] shrink-0">Stage</div>
                      </div>
                      <div className="w-[180px] shrink-0">Status</div>
                      <div className="w-[130px] shrink-0">Books</div>
                      <div className="w-[150px] shrink-0 min-w-0">Holder</div>
                      <div className="w-[100px] shrink-0 ml-auto pr-4 text-right">Updated / Created</div>
                      <div className="w-4 shrink-0"></div>
                    </div>
                    {paginatedTransitions.map((t) => {
                      const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'storage'];
                      const isExpanded = expandedTimelineId === t.id;
                      const box = t.box;
                      if (!box) return null;
                      
                      let stageIdx = PIPELINE_STAGES.indexOf(box.current_stage);
                      if (box.current_stage === 'transmit') stageIdx = 4;
                      const isCompleted = box.current_stage === 'storage' && t.storage_time_assigned != null;

                      // Determine status and holder
                      let statusText = 'In progress';
                      let statusColor = 'bg-blue-100 text-blue-700';
                      let holderName = '—';
                      let holderStage = '';

                      if (box.current_stage === 'warehouse') {
                        holderName = t.warehouse_user_name || '—';
                        holderStage = 'Warehouse';
                        if (!isCompleted) {
                          if (t.warehouse_scan_name) {
                            statusText = 'Received • Completed • Sent';
                            statusColor = 'bg-green-100 text-green-700';
                          } else {
                            statusText = 'Received';
                            statusColor = 'bg-yellow-100 text-yellow-700';
                          }
                        }
                      } else if (box.current_stage === 'inventory') {
                        holderName = t.inventory_user_name || '—';
                        holderStage = 'Inventory';
                        if (!isCompleted) {
                          if (t.inventory_send_name) {
                            statusText = 'Sent';
                            statusColor = 'bg-indigo-100 text-indigo-700';
                          } else if (t.inventory_scan_name) {
                            statusText = 'Completed';
                            statusColor = 'bg-green-100 text-green-700';
                          } else if (t.inventory_time_received) {
                            statusText = 'Received';
                            statusColor = 'bg-yellow-100 text-yellow-700';
                          }
                        }
                      } else if (box.current_stage === 'cut') {
                        holderName = t.cut_user_name || '—';
                        holderStage = 'Cut';
                        if (!isCompleted) {
                          if (t.cut_send_name) {
                            statusText = 'Sent';
                            statusColor = 'bg-indigo-100 text-indigo-700';
                          } else if (t.cut_time_received) {
                            statusText = 'Received';
                            statusColor = 'bg-yellow-100 text-yellow-700';
                          }
                        }
                      } else if (box.current_stage === 'endorsement') {
                        holderName = t.endorsement_user_name || '—';
                        holderStage = 'Endorsement';
                        if (!isCompleted) {
                          if (t.endorsement_send_name) {
                            statusText = 'Sent';
                            statusColor = 'bg-indigo-100 text-indigo-700';
                          } else if (t.endorsement_scan_name) {
                            statusText = 'Completed';
                            statusColor = 'bg-green-100 text-green-700';
                          } else if (t.endorsement_time_received) {
                            statusText = 'Received';
                            statusColor = 'bg-yellow-100 text-yellow-700';
                          }
                        }
                      } else if (box.current_stage === 'scan' || box.current_stage === 'transmit') {
                        holderName = t.scan_user_name || '—';
                        holderStage = box.current_stage === 'transmit' ? 'Transmit' : 'Scan';
                        if (box.current_stage === 'transmit') {
                          statusText = 'Transmitted';
                          statusColor = 'bg-blue-100 text-blue-700';
                        } else if (t.scan_time_received) {
                          statusText = 'Received';
                          statusColor = 'bg-yellow-100 text-yellow-700';
                        }
                      } else if (box.current_stage === 'storage') {
                        holderName = t.storage_user_name || t.scan_user_name || '—';
                        holderStage = 'Storage';
                      }

                      if (isCompleted) {
                        statusText = 'Completed';
                        statusColor = 'bg-green-100 text-green-700';
                      }

                      return (
                        <div key={t.id} className="border-b border-border/50 last:border-0 flex flex-col bg-card hover:bg-muted/30 transition-colors">
                          {/* Main Row */}
                          <div 
                            className="flex items-center px-6 py-4 cursor-pointer gap-4"
                            onClick={() => setExpandedTimelineId(isExpanded ? null : t.id)}
                          >
                            {/* Box & Stage Dots */}
                            <div className="w-[220px] shrink-0 flex items-center">
                              <div className="w-[80px] shrink-0 flex flex-col mr-2">
                                <span className="font-bold text-foreground text-sm truncate">{box.box_number}</span>
                                {box.lot?.lot_number && (
                                  <span className="text-[10px] text-muted-foreground font-semibold truncate">{box.lot.lot_number}</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 w-[130px]">
                                <div className="flex items-center gap-1.5">
                                  {PIPELINE_STAGES.map((s, i) => {
                                    let dotColor = "bg-muted-foreground/30";
                                    if (isCompleted || i < stageIdx) dotColor = "bg-green-500";
                                    else if (i === stageIdx) dotColor = "bg-blue-500";
                                    return <div key={s} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                  })}
                                </div>
                                <span className="text-[10px] text-muted-foreground capitalize font-medium truncate">{box.current_stage}</span>
                              </div>
                            </div>

                            {/* Status */}
                            <div className="w-[180px] shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide whitespace-nowrap ${statusColor}`}>
                                {statusText}
                              </span>
                            </div>

                            {/* Scan / Expected */}
                            <div className="w-[130px] shrink-0 flex flex-col">
                              <span className="text-sm font-semibold text-foreground">
                                {t.total_scanned_books ?? 0} / {box.total_expected_books ?? 0}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Books</span>
                            </div>

                            {/* Holder */}
                            <div className="w-[150px] shrink-0 flex flex-col min-w-0">
                              <span className="text-sm font-semibold text-foreground truncate" title={holderName}>{holderName}</span>
                              <span className="text-[11px] text-muted-foreground">{holderStage}</span>
                            </div>

                            {/* Updated */}
                            <div className="w-[100px] shrink-0 flex flex-col items-end justify-center ml-auto pr-4">
                              <span className="text-xs text-muted-foreground">{t.updated_at ? formatTime(t.updated_at) : '—'}</span>
                              {box.created_at && <span className="text-[10px] text-muted-foreground opacity-75 mt-0.5">{new Date(box.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>}
                            </div>

                            {/* Chevron */}
                            <div className="text-muted-foreground">
                               <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                            </div>
                          </div>

                          {/* Expanded Timeline */}
                          {isExpanded && (
                            <div className="px-6 py-4 bg-muted/20 border-t border-border overflow-hidden">
                              <div className="flex items-start justify-between relative px-2">
                                {/* Connecting background line */}
                                <div className="absolute top-3 left-10 right-10 h-[2px] bg-border z-0" />
                                {/* Progress line */}
                                <div 
                                  className="absolute top-3 left-10 h-[2px] bg-green-500 z-0 transition-all duration-500" 
                                  style={{ width: `calc(${isCompleted ? 100 : (stageIdx / (PIPELINE_STAGES.length - 1)) * 100}% - 80px)` }} 
                                />
                                
                                {PIPELINE_STAGES.map((s, i) => {
                                  const isPast = isCompleted || i < stageIdx;
                                  const isCurrent = i === stageIdx;
                                  const isFuture = !isCompleted && i > stageIdx;

                                  let icon = <div className="w-6 h-6 rounded-full bg-muted border-2 border-background z-10" />;
                                  if (isPast) {
                                    icon = (
                                      <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center z-10 border-2 border-background shadow-sm">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                      </div>
                                    );
                                  } else if (isCurrent) {
                                    icon = (
                                      <div className="w-6 h-6 rounded-full bg-blue-500 z-10 border-2 border-background shadow-sm flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                      </div>
                                    );
                                  }

                                  // Get times based on stage
                                  let recvTime = null;
                                  let recvUser = null;
                                  let scanTime = null;
                                  let scanUser = null;
                                  let sendTime = null;
                                  let sendUser = null;

                                  if (s === 'warehouse') {
                                    recvTime = t.warehouse_time_received; recvUser = t.warehouse_user_name;
                                    scanTime = t.warehouse_scan_at; scanUser = t.warehouse_scan_name;
                                  } else if (s === 'inventory') {
                                    recvTime = t.inventory_time_received; recvUser = t.inventory_user_name;
                                    scanTime = t.inventory_scan_at; scanUser = t.inventory_scan_name;
                                    sendTime = t.inventory_time_send; sendUser = t.inventory_send_name;
                                  } else if (s === 'cut') {
                                    recvTime = t.cut_time_received; recvUser = t.cut_user_name;
                                    sendTime = t.cut_time_send; sendUser = t.cut_send_name;
                                  } else if (s === 'endorsement') {
                                    recvTime = t.endorsement_time_received; recvUser = t.endorsement_user_name;
                                    scanTime = t.endorsement_scan_at; scanUser = t.endorsement_scan_name;
                                    sendTime = t.endorsement_time_send; sendUser = t.endorsement_send_name;
                                  } else if (s === 'scan') {
                                    recvTime = t.scan_time_received; recvUser = t.scan_user_name;
                                  } else if (s === 'storage') {
                                    recvTime = t.storage_time_assigned; recvUser = t.storage_user_name;
                                  }

                                  return (
                                    <div key={s} className="flex flex-col items-center flex-1 z-10 relative">
                                       {icon}
                                       <span className={cn("text-[11px] font-bold mt-2 capitalize", (isPast || isCurrent) ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                                       <div className="mt-1 flex flex-col items-center text-[10px] text-muted-foreground text-center">
                                         {!recvTime && !sendTime && !scanTime && (
                                           <span className="opacity-50">not logged</span>
                                         )}
                                         <div className="flex flex-col text-[10px] text-muted-foreground">
                                         {s === 'warehouse' ? (
                                           (recvTime || scanTime) && (
                                             <span className="whitespace-nowrap">↓ ✓ ↑ {(scanUser || recvUser)?.split(' ')[0] || 'System'}, {new Date((scanTime || recvTime)!).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase()}</span>
                                           )
                                         ) : (
                                           <>
                                             {recvTime && (
                                               <span className="whitespace-nowrap">↓ {recvUser?.split(' ')[0] || 'System'}, {new Date(recvTime!).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase()}</span>
                                             )}
                                             {scanTime && (
                                               <span className="whitespace-nowrap mt-0.5">✓ {scanUser?.split(' ')[0] || 'System'}, {new Date(scanTime!).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase()}</span>
                                             )}
                                             {sendTime && (
                                               <span className="whitespace-nowrap mt-0.5">↑ {sendUser?.split(' ')[0] || 'System'}, {new Date(sendTime).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase()}</span>
                                             )}
                                           </>
                                         )}
                                         </div>
                                       </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {filteredTransitions.length > 0 && (
                  <Pagination
                    currentPage={transitionsPagination.currentPage}
                    totalPages={Math.max(1, transitionsPagination.totalPages)}
                    pageSize={transitionsPagination.pageSize}
                    onPageChange={transitionsPagination.goToPage}
                    onPageSizeChange={transitionsPagination.setPageSize}
                    canPrevPage={transitionsPagination.canPrevPage}
                    canNextPage={transitionsPagination.canNextPage}
                    pageSizeOptions={[]}
                    showPageInfo={false}
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
