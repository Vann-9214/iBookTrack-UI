"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch } from "@/lib/auth-api"
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
import {
  Scan, Package, Scissors, CheckCircle, Camera,
  Shield, Radio, Warehouse, ArrowRight, RefreshCw, ChevronRight, Search, X, Calendar as CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const STAGE_ORDER = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage'] as const
type Stage = typeof STAGE_ORDER[number]

const STAGE_META: Record<Stage, { label: string; icon: React.ElementType; color: string }> = {
  warehouse:   { label: 'Warehouse',   icon: Package,     color: 'bg-gray-100 text-gray-700 border-gray-300' },
  inventory:   { label: 'Inventory',   icon: Warehouse,   color: 'bg-slate-100 text-slate-700 border-slate-300' },
  cut:         { label: 'Cut',         icon: Scissors,    color: 'bg-orange-100 text-orange-700 border-orange-300' },
  endorsement: { label: 'Endorsement', icon: CheckCircle, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  scan:        { label: 'Scan',        icon: Camera,      color: 'bg-blue-100 text-blue-700 border-blue-300' },
  transmit:    { label: 'Transmit',    icon: Radio,       color: 'bg-green-100 text-green-700 border-green-300' },
  storage:     { label: 'Storage',     icon: Warehouse,   color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
}

interface BoxItem {
  id: string
  box_number: string
  current_stage: Stage
  total_books: number
  received_at: string | null
  lot: { lot_number: string } | null
}

interface ScannedBook {
  id: string
  isbn: string
  title: string | null
  scan_status: string
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
  const [boxes, setBoxes] = useState<BoxItem[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [receiving, setReceiving] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [scanInput, setScanInput] = useState('')
  const [highlightBox, setHighlightBox] = useState<string | null>(null)
  const [transitionSearch, setTransitionSearch] = useState('')
  const [transitionDateFrom, setTransitionDateFrom] = useState('')
  const [transitionDateTo, setTransitionDateTo] = useState('')
  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)
  const [confirmBox, setConfirmBox] = useState<BoxItem | null>(null)
  const [undoEntry, setUndoEntry] = useState<{ box: BoxItem; fromStage: string; toStage: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scannedBox, setScannedBox] = useState<{ box: BoxItem; books: ScannedBook[] } | null>(null)
  const [loadingScannedBox, setLoadingScannedBox] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [stageModalSearch, setStageModalSearch] = useState('')

  // Use refs to track previous data and prevent unnecessary re-renders
  const prevBoxesRef = useRef<BoxItem[]>([])
  const prevTransitionsRef = useRef<Transition[]>([])

  // Helper to check if data actually changed
  const hasDataChanged = useCallback((oldData: any[], newData: any[]): boolean => {
    if (oldData.length !== newData.length) return true
    return oldData.some((item, i) => JSON.stringify(item) !== JSON.stringify(newData[i]))
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [boxRes, transRes] = await Promise.all([
        authFetch(`${API_URL}/api/boxes?exclude_assigned_storage=true`),
        authFetch(`${API_URL}/api/boxes/pipeline-transitions?limit=50`),
      ])
      const boxData = await boxRes.json()
      const transData = await transRes.json()
      console.log('[Checkpoints] boxes response:', boxData)
      console.log('[Checkpoints] transitions response:', transData)
      
      // Only update state if data actually changed
      if (boxData.boxes && hasDataChanged(prevBoxesRef.current, boxData.boxes)) {
        setBoxes(boxData.boxes)
        prevBoxesRef.current = boxData.boxes
      }
      if (transData.success && hasDataChanged(prevTransitionsRef.current, transData.transitions)) {
        setTransitions(transData.transitions)
        prevTransitionsRef.current = transData.transitions
      }
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Failed to fetch checkpoint data:', e)
    } finally {
      setLoading(false)
    }
  }, [hasDataChanged])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

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
      if (!res.ok) throw new Error(data.error || 'Failed to advance')
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
    if (stage === 'transmit') {
      return <span className="text-[10px] text-muted-foreground italic px-1">Auto</span>
    }
    if (stage === 'warehouse' || box.received_at) {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={advancing === box.id}
          onClick={(e) => { e.stopPropagation(); setConfirmBox(box) }}
          className="h-7 gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0"
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
      setLoadingScannedBox(true)
      setScannedBox(null)
      try {
        const res = await authFetch(`${API_URL}/api/boxes/${match.id}`)
        const data = await res.json()
        setScannedBox({ box: match, books: data.box?.books || [] })
      } catch {
        toast.error('Failed to load box contents')
      } finally {
        setLoadingScannedBox(false)
      }
    } else {
      toast.warning(`Box "${scanInput}" not found`)
    }
    setScanInput('')
  }

  const boxesByStage = STAGE_ORDER.reduce<Record<Stage, BoxItem[]>>((acc, stage) => {
    acc[stage] = boxes.filter(b => b.current_stage === stage)
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
    return d.toLocaleDateString()
  }

  const STAGE_LABELS: Record<string, string> = {
    warehouse: 'Warehouse', inventory: 'Inventory', cut: 'Cut',
    endorsement: 'Endorsement', scan: 'Scan', transmit: 'Transmit', storage: 'Storage'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8">

            {/* Scanned Box Contents Modal */}
            {(scannedBox || loadingScannedBox) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setScannedBox(null)}>
                <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground font-mono">{scannedBox?.box.box_number}</h3>
                      <p className="text-xs text-muted-foreground">
                        {scannedBox?.box.lot?.lot_number} · <span className="capitalize">{scannedBox?.box.current_stage}</span> · {scannedBox?.box.total_books} books
                      </p>
                    </div>
                    <button onClick={() => setScannedBox(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
                  </div>
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
                            <th className="pb-2 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scannedBox?.books.map((book, i) => (
                            <tr key={book.id} className="border-b border-border/40 last:border-0">
                              <td className="py-1.5 text-muted-foreground pr-2">{i + 1}</td>
                              <td className="py-1.5 font-mono pr-3">{book.isbn}</td>
                              <td className="py-1.5 pr-3 max-w-[220px] truncate text-foreground">{book.title || '—'}</td>
                              <td className="py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : book.scan_status === 'non_processable' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {book.scan_status === 'processable' ? 'Processable' : book.scan_status === 'non_processable' ? 'Non-Processable' : book.scan_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirmation Dialog */}
            {confirmBox && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                  <h3 className="text-base font-semibold text-foreground mb-1">Confirm Receive</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    Move <span className="font-mono font-semibold text-foreground">{confirmBox.box_number}</span> from
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STAGE_META[confirmBox.current_stage]?.color}`}>
                      {STAGE_META[confirmBox.current_stage]?.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STAGE_META[STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) + 1]]?.color}`}>
                      {STAGE_META[STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) + 1]]?.label}
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
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
                            placeholder="Search box number or lot..."
                            value={stageModalSearch}
                            onChange={e => setStageModalSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      {/* Box list */}
                      <div className="flex-1 overflow-y-auto p-4">
                        {filteredBoxes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                            {stageModalSearch ? 'No matching boxes found.' : 'No boxes at this station.'}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {filteredBoxes.map(box => (
                              <div
                                key={box.id}
                                id={`box-${box.id}`}
                                className={cn(
                                  "flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors",
                                  highlightBox === box.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/40 hover:bg-muted/70'
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-mono font-medium text-card-foreground">{box.box_number}</p>
                                  <p className="text-xs text-muted-foreground">{box.lot?.lot_number || '—'} · {box.total_books} books</p>
                                </div>
                                {renderBoxAction(box)}
                              </div>
                            ))}
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
                  <span className="font-mono font-semibold">{undoEntry.box.box_number}</span> moved to <span className="font-semibold capitalize">{STAGE_LABELS[undoEntry.toStage]}</span>
                </span>
                <button onClick={handleUndo} className="ml-2 px-3 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 text-xs font-semibold transition-colors">Undo</button>
                <button onClick={() => { setUndoEntry(null); if (undoTimer.current) clearTimeout(undoTimer.current) }} className="text-muted-foreground hover:text-foreground">✕</button>
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
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Scan className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Scan box barcode..."
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={handleScan}
                    className="w-56 pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={fetchData}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {lastUpdated && <span>{lastUpdated}</span>}
                </button>
              </div>
            </header>

            {/* Pipeline Stage Flow */}
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

            {/* Station Cards Grid */}
            {loading ? (
              <div className="text-center py-16 text-sm text-muted-foreground">Loading stations...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STAGE_ORDER.map((stage) => {
                  const meta = STAGE_META[stage]
                  const stageBoxes = boxesByStage[stage]
                  const previewBoxes = stageBoxes.slice(0, 3)
                  const borderClass = meta.color.split(' ').find(c => c.startsWith('border-')) || 'border-gray-300'
                  const textClass = meta.color.split(' ').find(c => c.startsWith('text-')) || 'text-gray-700'

                  return (
                    <div
                      key={stage}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedStage(stage); setStageModalSearch('') }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setSelectedStage(stage); setStageModalSearch('') }}}
                      className={cn(
                        "rounded-2xl border border-border bg-card shadow-sm p-5 flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/30",
                        `border-t-4 ${borderClass}`
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", meta.color)}>
                          <meta.icon className="h-5 w-5" />
                        </div>
                        <span className={cn("text-3xl font-black", textClass)}>
                          {stageBoxes.length}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-card-foreground">{meta.label}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{stageBoxes.length === 1 ? 'box' : 'boxes'} waiting</p>

                      {previewBoxes.length > 0 ? (
                        <div className="space-y-1.5 mt-auto">
                          {previewBoxes.map(box => (
                            <div key={box.id} className="flex items-center justify-between text-xs rounded-md border border-border bg-muted/40 px-2 py-1.5">
                              <span className="font-mono text-card-foreground truncate pr-2">{box.box_number}</span>
                              <span className="text-muted-foreground truncate">{box.lot?.lot_number || '—'}</span>
                            </div>
                          ))}
                          {stageBoxes.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center mt-2">+{stageBoxes.length - 3} more</p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-auto rounded-md border border-dashed border-border py-4 text-center">
                          <span className="text-xs text-muted-foreground">No boxes here</span>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span>Click to view</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  )
                })}
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
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">From</label>
                  <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-[150px] justify-start text-left font-normal text-sm"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {transitionDateFrom ? format(new Date(transitionDateFrom), 'MMM dd, yyyy') : 'Pick a date'}
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
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">To</label>
                  <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-[150px] justify-start text-left font-normal text-sm"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {transitionDateTo ? format(new Date(transitionDateTo), 'MMM dd, yyyy') : 'Pick a date'}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTransitionSearch(''); setTransitionDateFrom(''); setTransitionDateTo('') }}
                  className="h-9 px-3 text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
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
                          <TableCell className="font-mono text-xs text-card-foreground px-4 py-3">
                            {t.box?.box_number || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-4 py-3">
                            {t.box?.lot?.lot_number || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {t.from_stage ? (
                              <Badge variant="outline" className={cn("text-[10px] font-normal capitalize border", STAGE_META[t.from_stage as Stage]?.color || '')}>
                                {STAGE_META[t.from_stage as Stage]?.label || t.from_stage}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline" className={cn("text-[10px] font-normal capitalize border", STAGE_META[t.to_stage as Stage]?.color || '')}>
                              {STAGE_META[t.to_stage as Stage]?.label || t.to_stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-4 py-3">
                            {t.moved_by_name || '—'}
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
