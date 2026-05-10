"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch } from "@/lib/auth-api"
import { toast } from "sonner"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Scan, Package, Scissors, CheckCircle, Camera,
  Shield, Radio, Warehouse, ArrowRight, RefreshCw, ChevronRight,
} from "lucide-react"

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
  const [confirmBox, setConfirmBox] = useState<BoxItem | null>(null)
  const [undoEntry, setUndoEntry] = useState<{ box: BoxItem; fromStage: string; toStage: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scannedBox, setScannedBox] = useState<{ box: BoxItem; books: ScannedBook[] } | null>(null)
  const [loadingScannedBox, setLoadingScannedBox] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [boxRes, transRes] = await Promise.all([
        authFetch(`${API_URL}/api/boxes`),
        authFetch(`${API_URL}/api/boxes/pipeline-transitions?limit=50`),
      ])
      const boxData = await boxRes.json()
      const transData = await transRes.json()
      console.log('[Checkpoints] boxes response:', boxData)
      console.log('[Checkpoints] transitions response:', transData)
      if (boxData.boxes) setBoxes(boxData.boxes)
      if (transData.success) setTransitions(transData.transitions)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Failed to fetch checkpoint data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

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
        <ScrollArea className="flex-1 h-0 min-h-0">
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
                  const isLast = stage === 'storage'

                  return (
                    <Card key={stage} className="border-border bg-card flex flex-col">
                      <CardHeader className="flex flex-row items-center gap-3 pb-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${meta.color}`}>
                          <meta.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold text-card-foreground leading-tight">
                            {meta.label}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{stageBoxes.length} box{stageBoxes.length !== 1 ? 'es' : ''}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 flex flex-col gap-2">
                        {stageBoxes.length === 0 ? (
                          <div className="flex items-center justify-center rounded-md border border-dashed border-border py-4 flex-1">
                            <span className="text-xs text-muted-foreground">No boxes here</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                            {stageBoxes.map(box => (
                              <div
                                key={box.id}
                                id={`box-${box.id}`}
                                className={`flex items-center justify-between rounded-md border px-2.5 py-2 transition-colors ${
                                  highlightBox === box.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border bg-muted/40 hover:bg-muted/70'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-mono font-medium text-card-foreground truncate">{box.box_number}</p>
                                  <p className="text-[10px] text-muted-foreground">{box.lot?.lot_number || '—'} · {box.total_books} books</p>
                                </div>
                                {!isLast && (
                                  <div className="ml-2 flex flex-col gap-1 shrink-0">
                                    {stage === 'warehouse' || box.received_at ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={advancing === box.id}
                                        onClick={() => setConfirmBox(box)}
                                        className="h-7 gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                                      >
                                        {advancing === box.id ? '...' : 'Send'}
                                        {advancing !== box.id && <ArrowRight className="h-3 w-3" />}
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={receiving === box.id}
                                        onClick={() => handleReceive(box)}
                                        className="h-7 gap-1 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-50 shrink-0"
                                      >
                                        {receiving === box.id ? '...' : 'Receive'}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {isLast && (
                                  <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 ml-2 shrink-0">
                                    Done
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Pipeline Transition Logs */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-card-foreground">Pipeline Transition Log</CardTitle>
                <span className="text-xs text-muted-foreground">{transitions.length} entries</span>
              </CardHeader>
              <CardContent className="p-0">
                {transitions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No transitions logged yet. Use &quot;Receive&quot; buttons above to advance boxes.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs text-muted-foreground font-medium">Box</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">Lot</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">From</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">To</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">Received By</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transitions.map((t) => (
                        <TableRow key={t.id} className="border-border">
                          <TableCell className="font-mono text-xs text-card-foreground">
                            {t.box?.box_number || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.box?.lot?.lot_number || '—'}
                          </TableCell>
                          <TableCell>
                            {t.from_stage ? (
                              <Badge variant="secondary" className="text-[10px] font-normal capitalize">
                                {STAGE_META[t.from_stage as Stage]?.label || t.from_stage}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-normal capitalize border ${STAGE_META[t.to_stage as Stage]?.color || ''}`}>
                              {STAGE_META[t.to_stage as Stage]?.label || t.to_stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.moved_by_name || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground text-right">
                            {formatTime(t.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
