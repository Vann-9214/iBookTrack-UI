"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { authFetch } from "@/lib/auth-api"
import { toast } from "sonner"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { Button } from "@/components/ui/button"
import { Layers, AlertTriangle, ChevronDown, ChevronRight, RefreshCw, Search, CheckCircle2 } from "lucide-react"

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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const persistedFlags = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
        setDropdownPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openIssueDropdown = (bookId: string) => {
    if (openDropdown === bookId) {
      setOpenDropdown(null)
      setDropdownPos(null)
      return
    }
    const btn = buttonRefs.current[bookId]
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpenDropdown(bookId)
  }

  const fetchBoxes = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/boxes?current_stage=endorsement`)
      const data = await res.json()
      if (data.boxes) {
        // Only show boxes that have been received at QC (received_at is set)
        const incoming: BoxEntry[] = data.boxes.filter((b: BoxEntry) => b.received_at !== null)
        // Preserve already-loaded books so expanded lots don't disappear on refresh
        setBoxes(prev => incoming.map(box => {
          const existing = prev.find(p => p.id === box.id)
          return existing?.books ? { ...box, books: existing.books } : box
        }))
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
      // Always re-fetch from server to get fresh flag data
      const updatedBoxes = await Promise.all(lotBoxes.map(async box => {
        const res = await authFetch(`${API_URL}/api/boxes/${box.id}`)
        const data = await res.json()
        const books: BookEntry[] = data.box?.books || []
        return { ...box, books }
      }))
      // Single batched update — avoids race with periodic fetchBoxes refresh
      const bookMap = new Map(updatedBoxes.map(b => [b.id, b.books]))
      setBoxes(prev => prev.map(b => bookMap.has(b.id) ? { ...b, books: bookMap.get(b.id) ?? [] } : b))

      // Always overwrite bookIssues from fresh server data — never use stale state
      setBookIssues(prev => {
        const updated = { ...prev }
        updatedBoxes.flatMap(b => b.books || []).forEach(book => {
          if (book.flag) {
            updated[book.id] = { issue: book.flag.issue, remarks: book.flag.remarks || '', saved: true }
            persistedFlags.current.add(book.id)
          } else {
            delete updated[book.id]
            persistedFlags.current.delete(book.id)
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
    setSaving(book.id)
    try {
      if (entry?.issue) {
        const res = await authFetch(`${API_URL}/api/books/${book.id}/flag`, {
          method: 'POST',
          body: JSON.stringify({ issue: entry.issue, remarks: entry.remarks, box_id: boxId })
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
        setIssueField(book.id, 'saved', true)
        toast.success('Issue flagged')
      } else {
        const res = await authFetch(`${API_URL}/api/books/${book.id}/flag`, { method: 'DELETE' })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
        setBookIssues(prev => { const n = { ...prev }; delete n[book.id]; return n })
        toast.success('Book marked as OK')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
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
    <>
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8">

            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Book Inspection & Endorsement</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Expand a lot to inspect all ISBNs and flag any quality issues.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchBoxes}
                  disabled={loading}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {lastUpdated && <span className="text-xs text-muted-foreground">Updated {lastUpdated}</span>}
              </div>
            </header>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search lot number..."
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
              <div className="flex flex-col gap-4">
                {filteredLots.map(lot => {
                  const isLotOpen = expandedLot === lot.lotNumber
                  const allBooks = lot.boxes.flatMap(b => b.books || [])
                  const totalBooks = lot.boxes.reduce((s, b) => s + (b.total_books || 0), 0)
                  const flaggedCount = allBooks.filter(b => bookIssues[b.id]?.saved).length

                  return (
                    <div key={lot.lotNumber} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

                      {/* Lot header — tinted yellow */}
                      <button
                        className="w-full text-left"
                        onClick={() => loadLotBooks(lot.lotNumber, lot.boxes)}
                      >
                        <div className={`flex items-center gap-4 px-5 py-4 bg-yellow-50 hover:bg-yellow-100 transition-colors border-b ${isLotOpen ? 'border-yellow-300' : 'border-yellow-100'}`}>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-white shrink-0">
                            <Layers className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-800">{lot.lotNumber}</span>
                              <span className="inline-flex items-center rounded-full bg-yellow-100 border border-yellow-300 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">Endorsement</span>
                              <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{lot.boxes.length} box{lot.boxes.length !== 1 ? 'es' : ''}</span>
                              <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{totalBooks} books</span>
                              {flaggedCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                  <AlertTriangle className="h-2.5 w-2.5" />{flaggedCount} flagged
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{lot.boxes.map(b => b.box_number).join(', ')}</p>
                          </div>
                          {isLotOpen
                            ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                        </div>
                      </button>

                      {/* Book table */}
                      {isLotOpen && (
                        <>
                          {loadingBooks === lot.lotNumber ? (
                            <div className="py-10 text-center text-sm text-gray-400">Loading books…</div>
                          ) : allBooks.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-400">No books loaded yet.</div>
                          ) : (
                            <table className="w-full text-sm table-fixed">
                              <colgroup>
                                <col className="w-8" />
                                <col className="w-[13%]" />
                                <col className="w-[28%]" />
                                <col className="w-[22%]" />
                                <col />
                              </colgroup>
                              <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left">#</th>
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left">ISBN</th>
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left">Title</th>
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 text-left">Box</th>
                                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide pl-10 pr-5 py-3 text-left">Issue / Flag</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lot.boxes.flatMap(box =>
                                  (box.books || []).map((book, idx) => {
                                    const issueEntry = bookIssues[book.id]
                                    const isFlagged = issueEntry?.saved
                                    const globalIdx = lot.boxes.slice(0, lot.boxes.indexOf(box)).reduce((s, b) => s + (b.books?.length || 0), 0) + idx

                                    return (
                                      <tr key={`${box.id}-${book.id}`} className={`border-b border-gray-50 transition-colors ${isFlagged ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-5 py-3.5 text-xs text-gray-400 align-middle">{globalIdx + 1}</td>
                                        <td className="px-5 py-3.5 align-middle">
                                          <span className="text-xs font-bold text-gray-800 break-all">{book.isbn}</span>
                                        </td>
                                        <td className="px-5 py-3.5 align-middle">
                                          <span className="text-xs text-gray-600 line-clamp-2">{book.title || <span className="italic text-gray-400">No title</span>}</span>
                                        </td>
                                        <td className="px-5 py-3.5 align-middle">
                                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{box.box_number}</span>
                                        </td>
                                        <td className="pl-10 pr-5 py-3 align-middle">
                                          {!isFlagged ? (
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {/* Custom styled dropdown — portal-rendered to escape overflow:hidden */}
                                              <div className="relative">
                                                <button
                                                  type="button"
                                                  ref={el => { buttonRefs.current[book.id] = el }}
                                                  onClick={() => openIssueDropdown(book.id)}
                                                  className={`flex items-center justify-between gap-2 h-8 min-w-[180px] rounded-lg border px-3 text-xs font-medium transition-all ${
                                                    issueEntry?.issue
                                                      ? 'border-red-300 bg-red-50 text-red-700'
                                                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                                  }`}
                                                >
                                                  <span className="truncate">
                                                    {issueEntry?.issue
                                                      ? COMMON_ISSUES.find(i => i.value === issueEntry.issue)?.label
                                                      : '— No issue'}
                                                  </span>
                                                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${openDropdown === book.id ? 'rotate-180' : ''}`} />
                                                </button>
                                              </div>
                                              {issueEntry?.issue && (
                                                <input
                                                  type="text"
                                                  placeholder="Remarks / page no. (optional)"
                                                  value={issueEntry?.remarks || ''}
                                                  onChange={e => setIssueField(book.id, 'remarks', e.target.value)}
                                                  className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-300 w-44"
                                                />
                                              )}
                                              {issueEntry?.issue ? (
                                                <button
                                                  onClick={() => saveIssue(book, box.id)}
                                                  disabled={saving === book.id}
                                                  className="h-8 px-3 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                                                >
                                                  {saving === book.id ? '…' : 'Flag'}
                                                </button>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                                  <CheckCircle2 className="h-3.5 w-3.5" /> OK
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {book.flag?.source === 'scan_status' ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-semibold text-orange-700">
                                                  <AlertTriangle className="h-3 w-3" />
                                                  Non-Processable (Warehouse)
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">
                                                  <AlertTriangle className="h-3 w-3" />
                                                  {COMMON_ISSUES.find(i => i.value === issueEntry.issue)?.label || issueEntry.issue}
                                                </span>
                                              )}
                                              {issueEntry.remarks && (
                                                <span className="text-xs text-gray-400">— {issueEntry.remarks}</span>
                                              )}
                                              <button
                                                ref={el => { buttonRefs.current[`edit-${book.id}`] = el }}
                                                onClick={() => {
                                                  setBookIssues(prev => ({
                                                    ...prev,
                                                    [book.id]: { issue: issueEntry.issue, remarks: issueEntry.remarks, saved: false }
                                                  }))
                                                  const btn = buttonRefs.current[`edit-${book.id}`]
                                                  if (btn) {
                                                    const rect = btn.getBoundingClientRect()
                                                    setDropdownPos({ top: rect.bottom + 4, left: rect.left - 200 })
                                                  }
                                                  setOpenDropdown(book.id)
                                                }}
                                                className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                                              >
                                                {book.flag?.source === 'scan_status' ? 'Add QC note' : 'Edit'}
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>

      {/* Portal dropdown — rendered into body to escape overflow:hidden */}
      {openDropdown && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-72 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
          style={{ top: dropdownPos!.top, left: dropdownPos!.left }}
        >
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={async () => {
                const bookId = openDropdown!
                const hadPersistedFlag = persistedFlags.current.has(bookId)
                setOpenDropdown(null)
                setDropdownPos(null)
                if (hadPersistedFlag) {
                  try {
                    const res = await authFetch(`${API_URL}/api/books/${bookId}/flag`, { method: 'DELETE' })
                    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
                    setBookIssues(prev => { const n = { ...prev }; delete n[bookId]; return n })
                    persistedFlags.current.delete(bookId)
                    toast.success('Book marked as OK')
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed to clear flag')
                    setIssueField(bookId, 'saved', true)
                  }
                } else {
                  setIssueField(bookId, 'issue', '')
                }
              }}
              className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                !bookIssues[openDropdown!]?.issue ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              — No issue
            </button>
            {COMMON_ISSUES.map(i => (
              <button
                key={i.value}
                type="button"
                onClick={() => { setIssueField(openDropdown!, 'issue', i.value); setOpenDropdown(null); setDropdownPos(null) }}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors border-t border-gray-50 ${
                  bookIssues[openDropdown!]?.issue === i.value
                    ? 'bg-red-50 text-red-700'
                    : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-800'
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
