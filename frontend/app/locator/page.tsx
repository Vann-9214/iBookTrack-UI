"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Search, MapPin, Package, X, Plus, Loader2, ChevronDown, ChevronRight, Trash2, BookOpen, RefreshCw, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/auth-api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const RACKS = ["A", "B", "C", "D"]
const LEVELS = [4, 3, 2, 1]

type BookEntry = { isbn: string; title: string }

type Assignment = {
  assignment_id: string
  assigned_at: string
  assigned_by_name: string | null
  box_id: string
  box_number: string
  lot_number: string | null
  total_books: number
  books: BookEntry[]
}

type StorageLocation = {
  id: string
  rack_id: string
  level: number
  capacity: number
  used: number
  assignments: Assignment[]
}

type ReadyBox = {
  id: string
  box_number: string
  lot_number: string | null
  total_books: number
  books: BookEntry[]
}

type SearchResult = {
  assignment_id: string
  box_id: string
  box_number: string
  lot_number: string | null
  rack_id: string
  level: number
  location_id: string
  location_label: string
}

export default function WarehouseLocatorPage() {
  const [locations, setLocations] = useState<StorageLocation[]>([])
  const [readyBoxes, setReadyBoxes] = useState<ReadyBox[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [loadingReady, setLoadingReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchUnlocated, setSearchUnlocated] = useState<{ box_number: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set())

  // Slot detail modal
  const [detailSlot, setDetailSlot] = useState<StorageLocation | null>(null)
  const [expandedBox, setExpandedBox] = useState<string | null>(null)

  // Assign modal
  const [assignSlot, setAssignSlot] = useState<StorageLocation | null>(null)
  const [assigningBoxId, setAssigningBoxId] = useState<string | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)

  // Remove
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true)
    setError(null)
    try {
      const res = await authFetch(`${API_URL}/api/storage/locations`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load storage locations')
      setLocations(data.locations || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoadingLocations(false)
    }
  }, [])

  const fetchReadyBoxes = useCallback(async () => {
    setLoadingReady(true)
    try {
      const res = await authFetch(`${API_URL}/api/storage/ready-boxes`)
      const data = await res.json()
      if (res.ok) setReadyBoxes(data.boxes || [])
    } finally {
      setLoadingReady(false)
    }
  }, [])

  useEffect(() => { fetchLocations() }, [fetchLocations])

  const getLocation = (rack: string, level: number) =>
    locations.find(l => l.rack_id === rack && l.level === level)

  const getCapacityColor = (used: number, capacity: number) => {
    const pct = capacity > 0 ? (used / capacity) * 100 : 0
    if (pct >= 90) return "bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600"
    if (pct >= 70) return "bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600"
    if (pct > 0)   return "bg-emerald-100 border-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-600"
    return "bg-muted border-border"
  }

  const handleSearch = async () => {
    const q = searchValue.trim()
    if (!q) { setHighlightedCells(new Set()); setSearchDone(false); setSearchResults([]); return }
    setSearchLoading(true)
    setSearchDone(false)
    try {
      const res = await authFetch(`${API_URL}/api/storage/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (res.ok) {
        setSearchResults(data.results || [])
        setSearchUnlocated(data.unlocated || [])
        const cells = new Set<string>((data.results || []).map((r: SearchResult) => `${r.rack_id}-${r.level}`))
        setHighlightedCells(cells)
      }
    } finally {
      setSearchLoading(false)
      setSearchDone(true)
    }
  }

  const clearSearch = () => {
    setSearchValue("")
    setHighlightedCells(new Set())
    setSearchResults([])
    setSearchUnlocated([])
    setSearchDone(false)
  }

  const openAssign = async (loc: StorageLocation) => {
    setAssignSlot(loc)
    setAssigningBoxId(null)
    await fetchReadyBoxes()
  }

  const handleAssign = async () => {
    if (!assignSlot || !assigningBoxId) return
    setAssignLoading(true)
    try {
      const res = await authFetch(`${API_URL}/api/storage/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ box_id: assigningBoxId, storage_location_id: assignSlot.id }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to assign box'); return }
      setAssignSlot(null)
      await fetchLocations()
      // Also refresh detail if open for same slot
      if (detailSlot?.id === assignSlot.id) {
        const updated = locations.find(l => l.id === assignSlot.id)
        if (updated) setDetailSlot(updated)
      }
    } finally {
      setAssignLoading(false)
    }
  }

  const handleRemove = async (assignmentId: string) => {
    if (!confirm('Remove this box from the storage slot?')) return
    setRemovingId(assignmentId)
    try {
      const res = await authFetch(`${API_URL}/api/storage/assignment/${assignmentId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed to remove'); return }
      await fetchLocations()
    } finally {
      setRemovingId(null)
    }
  }

  // Keep detailSlot in sync after location refresh
  useEffect(() => {
    if (detailSlot) {
      const updated = locations.find(l => l.id === detailSlot.id)
      if (updated) setDetailSlot(updated)
    }
  }, [locations])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-5xl mx-auto">

            {/* Header */}
            <header className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Storage Locator</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assign incoming boxes to rack slots. Search by ISBN or box number to find their location.
                </p>
              </div>
              <button onClick={fetchLocations} disabled={loadingLocations} className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors">
                <RefreshCw className={cn("h-4 w-4", loadingLocations && "animate-spin")} />
              </button>
            </header>

            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ISBN or Box Number…"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={searchLoading} className="h-10 px-5">
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
              {(highlightedCells.size > 0 || searchDone) && (
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={clearSearch}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Search results */}
            {searchDone && (
              <div className="flex flex-col gap-2">
                {searchResults.length > 0 ? (
                  searchResults.map(r => (
                    <div key={r.assignment_id} className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 text-sm">
                        <span className="font-semibold text-foreground font-mono">{r.box_number}</span>
                        {r.lot_number && <span className="text-muted-foreground ml-2">· Lot {r.lot_number}</span>}
                      </div>
                      <span className="text-sm font-semibold text-primary">{r.location_label}</span>
                      <button onClick={() => {
                        const loc = locations.find(l => l.id === r.location_id)
                        if (loc) setDetailSlot(loc)
                      }} className="text-xs underline text-muted-foreground hover:text-foreground">View slot</button>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      No located box found for &ldquo;{searchValue}&rdquo;.
                      {searchUnlocated.length > 0 && ` Found box(es) in storage stage but not yet placed: ${searchUnlocated.map(u => u.box_number).join(', ')}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100" /><span>&lt; 70% full</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-amber-400 bg-amber-100" /><span>70–90% full</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-red-400 bg-red-100" /><span>&gt; 90% full</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded border border-border bg-muted" /><span>Empty</span></div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Warehouse Grid */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-center text-card-foreground mb-5">Warehouse Layout</h2>

              {loadingLocations ? (
                <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Loading storage map…</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Rack column headers */}
                  <div className="flex items-center gap-2">
                    <div className="w-16 text-right pr-2 text-xs font-medium text-muted-foreground">Level</div>
                    {RACKS.map(r => (
                      <div key={r} className="flex-1 text-center text-sm font-semibold text-foreground">Rack {r}</div>
                    ))}
                  </div>

                  {/* Grid rows */}
                  {LEVELS.map(level => (
                    <div key={level} className="flex items-center gap-2">
                      <div className="w-16 text-right pr-2 text-xs font-medium text-muted-foreground">{level}</div>
                      {RACKS.map(rack => {
                        const loc = getLocation(rack, level)
                        const isHighlighted = highlightedCells.has(`${rack}-${level}`)
                        const used = loc?.used ?? 0
                        const capacity = loc?.capacity ?? 20
                        return (
                          <button
                            key={`${rack}-${level}`}
                            onClick={() => loc && setDetailSlot(loc)}
                            disabled={!loc}
                            className={cn(
                              "flex-1 aspect-square rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                              loc ? getCapacityColor(used, capacity) : "bg-muted border-border opacity-40",
                              isHighlighted && "ring-4 ring-primary ring-offset-2 ring-offset-background scale-105 z-10",
                              loc && "hover:scale-105 hover:shadow-md cursor-pointer"
                            )}
                          >
                            {loc && used > 0 ? (
                              <>
                                <Package className="h-4 w-4 text-foreground/60" />
                                <span className="text-[10px] font-semibold text-foreground/70 leading-tight">{used}/{capacity}</span>
                              </>
                            ) : loc ? (
                              <Plus className="h-4 w-4 text-muted-foreground/40" />
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </ScrollArea>
      </main>

      {/* ── Slot Detail Modal ─────────────────────────────────────────── */}
      {detailSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDetailSlot(null); setExpandedBox(null) }}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Rack {detailSlot.rack_id} — Level {detailSlot.level}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{detailSlot.used} of {detailSlot.capacity} boxes used</p>
              </div>
              <button onClick={() => { setDetailSlot(null); setExpandedBox(null) }} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <Progress value={(detailSlot.used / detailSlot.capacity) * 100} className="h-2" />
            </div>

            {/* Assign button */}
            {detailSlot.used < detailSlot.capacity && (
              <button
                onClick={() => { setDetailSlot(null); openAssign(detailSlot) }}
                className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 py-2.5 text-sm text-primary font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Assign a box to this slot
              </button>
            )}

            {/* Box list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {detailSlot.assignments.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  This slot is empty
                </div>
              ) : (
                detailSlot.assignments.map(a => (
                  <div key={a.assignment_id} className="rounded-lg border border-border bg-muted/40">
                    {/* Box row */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <button
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        onClick={() => setExpandedBox(expandedBox === a.assignment_id ? null : a.assignment_id)}
                      >
                        {expandedBox === a.assignment_id
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <Package className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-mono text-sm font-semibold text-foreground truncate">{a.box_number}</span>
                        {a.lot_number && <span className="text-xs text-muted-foreground shrink-0">Lot {a.lot_number}</span>}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          <BookOpen className="inline h-3 w-3 mr-0.5" />{a.books.length} books
                        </span>
                      </button>
                      <button
                        onClick={() => handleRemove(a.assignment_id)}
                        disabled={removingId === a.assignment_id}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors shrink-0"
                        title="Remove from slot"
                      >
                        {removingId === a.assignment_id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Expanded ISBN/title list */}
                    {expandedBox === a.assignment_id && (
                      <div className="border-t border-border px-3 pb-2 pt-1 max-h-48 overflow-y-auto">
                        {a.books.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 italic">No scanned books recorded for this box</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border/40">
                                <th className="text-left py-1 font-medium">ISBN</th>
                                <th className="text-left py-1 font-medium">Title</th>
                              </tr>
                            </thead>
                            <tbody>
                              {a.books.map((b, i) => (
                                <tr key={i} className="border-b border-border/20 last:border-0">
                                  <td className="py-1 pr-3 font-mono text-foreground whitespace-nowrap">{b.isbn}</td>
                                  <td className="py-1 text-muted-foreground truncate max-w-[200px]" title={b.title}>{b.title}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Box Modal ──────────────────────────────────────────── */}
      {assignSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !assignLoading && setAssignSlot(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Assign Box to Slot</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rack {assignSlot.rack_id} — Level {assignSlot.level} &nbsp;·&nbsp; {assignSlot.used}/{assignSlot.capacity} used
                </p>
              </div>
              {!assignLoading && (
                <button onClick={() => setAssignSlot(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
              )}
            </div>

            {loadingReady ? (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading boxes ready for storage…</span>
              </div>
            ) : readyBoxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <Package className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No boxes are waiting to be placed.</p>
                <p className="text-xs text-muted-foreground">Boxes appear here once they reach the <strong>Storage</strong> stage via the pipeline.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">Select a box to place in this slot:</p>
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
                  {readyBoxes.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setAssigningBoxId(b.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        assigningBoxId === b.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/60"
                      )}
                    >
                      <Package className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-semibold text-foreground">{b.box_number}</p>
                        {b.lot_number && <p className="text-xs text-muted-foreground">Lot {b.lot_number}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        <BookOpen className="inline h-3 w-3 mr-0.5" />{b.books.length} books
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAssignSlot(null)} disabled={assignLoading}>Cancel</Button>
                  <Button onClick={handleAssign} disabled={!assigningBoxId || assignLoading}>
                    {assignLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Assignment
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
