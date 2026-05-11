"use client"

import { useState, useEffect, useCallback } from "react"
import { authFetch } from "@/lib/auth-api"
import { toast } from "sonner"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Layers, Package, CheckCircle, AlertTriangle, ChevronDown, ChevronRight, RefreshCw, Search } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const COMMON_ISSUES = [
  { value: "bleed-through",          label: "Bleed-through on page" },
  { value: "brittle",                label: "Brittle on page" },
  { value: "cannot-detach-sticky",   label: "Cannot be detached or sticky pages" },
  { value: "cd-only",                label: "CD only, no text content" },
  { value: "map-spanning",           label: "Contains a map spanning the entire book" },
  { value: "split-pages",            label: "Contains split pages" },
  { value: "cutoff-text",            label: "Cutoff text on page" },
  { value: "illegible-text",         label: "Illegible text" },
  { value: "inverted-contrast",      label: "Inverted contrast: White on black background" },
  { value: "missing-pages",          label: "Missing page/s" },
  { value: "no-content",             label: "No content or body text" },
  { value: "obscured-highlight",     label: "Obscured text due to highlight marker" },
  { value: "obscured-watermark",     label: "Obscured text due to watermarks" },
  { value: "oversized",              label: "Oversized and cannot fit in the scanner" },
  { value: "pen-marks",              label: "Pen marks on page" },
  { value: "pop-up-book",            label: "Pop-up book" },
  { value: "postcard-only",          label: "Postcard only" },
  { value: "stained-dirty",          label: "Stained or dirty page" },
  { value: "stamp-mark",             label: "Stamp mark on page" },
  { value: "thick-cardboard",        label: "Thick or cardboard pages" },
  { value: "torn-pages",             label: "Torn pages" },
]

interface BookEntry {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  scanned_at: string
  flag?: { issue: string; remarks: string; flagged_at: string; flagged_by_name: string; source?: string } | null
}

interface BoxEntry {
  id: string
  box_number: string
  total_books: number
  received_at: string | null
  lot: { lot_number: string } | null
  books?: BookEntry[]
}

interface BookIssue {
  issue: string
  remarks: string
  saved: boolean
}

export default function BookInspectionPage() {
  const [boxes, setBoxes] = useState<BoxEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedLot, setExpandedLot] = useState<string | null>(null)
  const [loadingBooks, setLoadingBooks] = useState<string | null>(null)
  const [bookIssues, setBookIssues] = useState<Record<string, BookIssue>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const fetchBoxes = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/boxes?current_stage=endorsement`)
      const data = await res.json()
      if (data.boxes) {
        // Only show boxes that have been received at QC (received_at is set)
        setBoxes(data.boxes.filter((b: BoxEntry) => b.received_at !== null))
      }
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Failed to fetch boxes:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBoxes()
    const interval = setInterval(fetchBoxes, 20000)
    return () => clearInterval(interval)
  }, [fetchBoxes])

  const loadLotBooks = async (lotNumber: string, lotBoxes: BoxEntry[]) => {
    if (expandedLot === lotNumber) { setExpandedLot(null); return }
    setExpandedLot(lotNumber)
    setLoadingBooks(lotNumber)
    try {
      // Load books for boxes not yet fetched — flags are embedded in each book
      const updatedBoxes = await Promise.all(lotBoxes.map(async box => {
        if (box.books) return box
        const res = await authFetch(`${API_URL}/api/boxes/${box.id}`)
        const data = await res.json()
        const books: BookEntry[] = data.box?.books || []
        setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, books } : b))
        return { ...box, books }
      }))

      // Pre-populate bookIssues from embedded flag data
      setBookIssues(prev => {
        const updated = { ...prev }
        updatedBoxes.flatMap(b => b.books || []).forEach(book => {
          if (book.flag && !updated[book.id]) {
            updated[book.id] = { issue: book.flag.issue, remarks: book.flag.remarks || '', saved: true }
          }
        })
        return updated
      })
    } catch (e) {
      console.error('Failed to fetch books:', e)
    } finally {
      setLoadingBooks(null)
    }
  }

  const setIssueField = (bookId: string, field: keyof BookIssue, value: string | boolean) => {
    setBookIssues(prev => ({
      ...prev,
      [bookId]: { ...{ issue: '', remarks: '', saved: false }, ...prev[bookId], [field]: value }
    }))
  }

  const saveIssue = async (book: BookEntry, boxId: string) => {
    const entry = bookIssues[book.id]
    if (!entry?.issue) { toast.error('Select an issue first'); return }
    setSaving(book.id)
    try {
      const res = await authFetch(`${API_URL}/api/books/${book.id}/flag`, {
        method: 'POST',
        body: JSON.stringify({ issue: entry.issue, remarks: entry.remarks, box_id: boxId })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      setIssueField(book.id, 'saved', true)
      toast.success('Issue flagged')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save issue')
    } finally {
      setSaving(null)
    }
  }

  // Group QC boxes by lot, flatten all books under each lot
  const lotMap = new Map<string, { lotNumber: string; boxes: BoxEntry[] }>()
  boxes.forEach(box => {
    const lotNum = box.lot?.lot_number || 'Unknown'
    if (!lotMap.has(lotNum)) lotMap.set(lotNum, { lotNumber: lotNum, boxes: [] })
    lotMap.get(lotNum)!.boxes.push(box)
  })
  const lots = Array.from(lotMap.values()).sort((a, b) => a.lotNumber.localeCompare(b.lotNumber))

  const filteredLots = lots.filter(l =>
    l.lotNumber.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="flex flex-col gap-6 p-6 lg:p-8">

            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Book Inspection & Endorsement</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Expand a lot to see its boxes, then expand a box to inspect all ISBNs and flag any issues.
                </p>
              </div>
              <button onClick={fetchBoxes} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto">
                <RefreshCw className="h-3.5 w-3.5" />
                {lastUpdated && <span>{lastUpdated}</span>}
              </button>
            </header>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search lot number or box..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Lot List */}
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filteredLots.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-muted-foreground">No lots ready for inspection.</p>
                <p className="text-xs text-muted-foreground mt-1">Boxes must be at Endorsement stage and marked as <strong>Received</strong> on Station Checkpoints first.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredLots.map(lot => {
                  const isLotOpen = expandedLot === lot.lotNumber
                  const allBooks = lot.boxes.flatMap(b => b.books || [])
                  const totalBooks = lot.boxes.reduce((s, b) => s + (b.total_books || 0), 0)
                  const flaggedCount = allBooks.filter(b => bookIssues[b.id]?.saved).length

                  return (
                    <Card key={lot.lotNumber} className="border-border bg-card">
                      {/* Lot header */}
                      <button className="w-full text-left" onClick={() => loadLotBooks(lot.lotNumber, lot.boxes)}>
                        <CardHeader className="flex flex-row items-center gap-3 py-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 border border-yellow-300 shrink-0">
                            <Layers className="h-4 w-4 text-yellow-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-card-foreground">{lot.lotNumber}</span>
                              <Badge variant="outline" className="text-[10px] border-yellow-300 text-yellow-700 bg-yellow-50">Endorsement</Badge>
                              <Badge variant="outline" className="text-[10px]">{lot.boxes.length} box{lot.boxes.length !== 1 ? 'es' : ''}</Badge>
                              <Badge variant="outline" className="text-[10px]">{totalBooks} books</Badge>
                              {flaggedCount > 0 && (
                                <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 bg-red-50 gap-1">
                                  <AlertTriangle className="h-2.5 w-2.5" />{flaggedCount} flagged
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isLotOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </CardHeader>
                      </button>

                      {/* Flat book list under lot */}
                      {isLotOpen && (
                        <CardContent className="pt-0 border-t border-border px-0 pb-0">
                          {loadingBooks === lot.lotNumber ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">Loading books...</div>
                          ) : allBooks.length === 0 ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">No books loaded yet.</div>
                          ) : (
                            <div className="divide-y divide-border">
                              {/* Column headers */}
                              <div className="px-4 py-2 grid grid-cols-[2rem_1fr_8rem_6rem] gap-2 bg-muted/40">
                                <span className="text-[10px] font-medium text-muted-foreground">#</span>
                                <span className="text-[10px] font-medium text-muted-foreground">ISBN / Title</span>
                                <span className="text-[10px] font-medium text-muted-foreground">Box</span>
                                <span className="text-[10px] font-medium text-muted-foreground">Status</span>
                              </div>
                              {lot.boxes.flatMap(box =>
                                (box.books || []).map((book, idx) => {
                                  const issueEntry = bookIssues[book.id]
                                  const isFlagged = issueEntry?.saved
                                  const globalIdx = lot.boxes.slice(0, lot.boxes.indexOf(box)).reduce((s, b) => s + (b.books?.length || 0), 0) + idx

                                  return (
                                    <div key={`${box.id}-${book.id}`} className="px-4 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                                      {/* # + ISBN + Title */}
                                      <div className="flex-1 min-w-0 grid grid-cols-[2rem_1fr] gap-2 items-start">
                                        <span className="text-[10px] text-muted-foreground pt-0.5">#{globalIdx + 1}</span>
                                        <div className="min-w-0">
                                          <p className="font-mono text-xs font-medium text-foreground">{book.isbn}</p>
                                          <p className="text-[11px] text-muted-foreground truncate">{book.title || <span className="italic">No title</span>}</p>
                                          <p className="text-[10px] text-muted-foreground/60">{box.box_number}</p>
                                        </div>
                                      </div>

                                      {/* Issue controls */}
                                      {!isFlagged ? (
                                        <div className="flex items-center gap-2 flex-wrap sm:shrink-0 pl-8 sm:pl-0">
                                          <select
                                            value={issueEntry?.issue || ''}
                                            onChange={e => setIssueField(book.id, 'issue', e.target.value)}
                                            className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none"
                                          >
                                            <option value="">No issue</option>
                                            {COMMON_ISSUES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                                          </select>
                                          {issueEntry?.issue && (
                                            <input
                                              type="text"
                                              placeholder="Page no. / remarks (optional)"
                                              value={issueEntry?.remarks || ''}
                                              onChange={e => setIssueField(book.id, 'remarks', e.target.value)}
                                              className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none w-44"
                                            />
                                          )}
                                          {issueEntry?.issue && (
                                            <button
                                              onClick={() => saveIssue(book, box.id)}
                                              disabled={saving === book.id}
                                              className="h-7 px-2.5 rounded-md bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                                            >
                                              {saving === book.id ? '...' : 'Flag'}
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-xs pl-8 sm:pl-0 sm:shrink-0 flex items-center gap-1.5 flex-wrap">
                                          {book.flag?.source === 'scan_status' ? (
                                            <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50 gap-1">
                                              <AlertTriangle className="h-2.5 w-2.5" />
                                              Non-Processable (Warehouse)
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 bg-red-50 gap-1">
                                              <AlertTriangle className="h-2.5 w-2.5" />
                                              {COMMON_ISSUES.find(i => i.value === issueEntry.issue)?.label || issueEntry.issue}
                                            </Badge>
                                          )}
                                          {issueEntry.remarks && <span className="text-muted-foreground text-[10px]">— {issueEntry.remarks}</span>}
                                          <button onClick={() => setBookIssues(prev => { const n = { ...prev }; delete n[book.id]; return n })} className="text-muted-foreground hover:text-foreground underline text-[10px] ml-1">
                                            {book.flag?.source === 'scan_status' ? 'Add QC note' : 'Edit'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}

          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
