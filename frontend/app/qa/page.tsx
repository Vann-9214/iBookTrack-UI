"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch, fetchUserProfile } from "@/lib/auth-api"
import { toast } from "sonner"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScannerInput } from "@/components/scanner-input"
import {
  AlertTriangle, ChevronDown, ChevronRight, RefreshCw, CheckCircle2,
  Inbox, ClipboardCheck, Send, Package, BookOpen, Loader2, Trash2, ClipboardList,
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const FLAG_ISSUES = [
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

interface BoxEntry {
  id: string
  box_number: string
  total_books_expected: number

  lot: { lot_number: string } | null
  box_sessions?: { started_at: string }[]
}

interface BoxBookEntry {
  id: string
  isbn: string
  title: string | null
  scan_status: string
}

interface InspScannedBook {
  id: string
  isbn: string
  title: string
  author: string
  scan_status: 'processable' | 'non_processable'
  flag_issue?: string
  flag_remarks?: string
  timestamp: Date
}

interface InspSession {
  id: string
  status: string
  total_scanned: number
  total_processable: number
  total_non_processable: number
  box_id?: string | null
}

const issueLabel = (val: string) => FLAG_ISSUES.find(i => i.value === val)?.label || val

export default function BookInspectionPage() {
  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'incoming' | 'inspection' | 'outgoing'>('incoming')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ── Incoming Boxes (cut stage) ──────────────────────────────────────────────
  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [loadingIncoming, setLoadingIncoming] = useState(true)
  const [receivingBox, setReceivingBox] = useState<string | null>(null)

  const fetchIncoming = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/boxes?current_stage=cut`)
      const data = await res.json()
      setIncomingBoxes(data.boxes || [])
    } catch (e) {
      console.error('Failed to fetch incoming boxes:', e)
    } finally {
      setLoadingIncoming(false)
    }
  }, [])

  const handleReceiveBox = async (box: BoxEntry) => {
    setReceivingBox(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Received at Book Inspection & Endorsement' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to receive box')
      toast.success(`${box.box_number} received`)
      fetchIncoming()
      fetchEndorsementBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceivingBox(null)
    }
  }

  // ── Endorsement Boxes (for inspection) ────────────────────────────────────
  const [endorsementBoxes, setEndorsementBoxes] = useState<BoxEntry[]>([])
  const [loadingEndorsement, setLoadingEndorsement] = useState(true)

  const fetchEndorsementBoxes = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/boxes?current_stage=endorsement`)
      const data = await res.json()
      if (data.boxes) {
        setEndorsementBoxes(data.boxes)
      }
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch endorsement boxes:', e)
    } finally {
      setLoadingEndorsement(false)
    }
  }, [])

  useEffect(() => {
    fetchIncoming()
    fetchEndorsementBoxes()
  }, [fetchIncoming, fetchEndorsementBoxes])

  // ── Outgoing Boxes (endorsed → send to Scan) ────────────────────────────────
  const [outgoingReadyIds, setOutgoingReadyIds] = useState<Set<string>>(new Set())
  const [sendingToScan, setSendingToScan] = useState<string | null>(null)

  const outgoingBoxes = endorsementBoxes.filter(b => outgoingReadyIds.has(b.id))
  const inspectionBoxes = endorsementBoxes.filter(b => !outgoingReadyIds.has(b.id))

  const handleSendToScan = async (box: BoxEntry) => {
    setSendingToScan(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Sent to Scan from Book Inspection & Endorsement' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send to scan')
      setOutgoingReadyIds(prev => { const next = new Set(prev); next.delete(box.id); return next })
      fetchEndorsementBoxes()
      toast.success(`${box.box_number} sent to Scan`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send to scan')
    } finally {
      setSendingToScan(null)
    }
  }

  // ── Book Inspection: expandable row books ────────────────────────────────
  const [inspExpandedBoxId, setInspExpandedBoxId] = useState<string | null>(null)
  const [inspRowBooks, setInspRowBooks] = useState<Record<string, BoxBookEntry[]>>({})
  const [loadingInspRowBooks, setLoadingInspRowBooks] = useState<string | null>(null)

  const toggleInspRow = async (boxId: string) => {
    if (inspExpandedBoxId === boxId) { setInspExpandedBoxId(null); return }
    setInspExpandedBoxId(boxId)
    if (!inspRowBooks[boxId]) {
      setLoadingInspRowBooks(boxId)
      try {
        const res = await authFetch(`${API_URL}/api/boxes/${boxId}`)
        const data = await res.json()
        setInspRowBooks(prev => ({ ...prev, [boxId]: data.box?.books || [] }))
      } catch {
        setInspRowBooks(prev => ({ ...prev, [boxId]: [] }))
      } finally {
        setLoadingInspRowBooks(null)
      }
    }
  }

  // ── Book Inspection: session state ────────────────────────────────────────
  const [inspSessionActive, setInspSessionActive] = useState(false)
  const [inspBox, setInspBox] = useState<BoxEntry | null>(null)
  const [inspUserName, setInspUserName] = useState('')
  const [inspCurrentSession, setInspCurrentSession] = useState<InspSession | null>(null)
  const [inspScannedBooks, setInspScannedBooks] = useState<InspScannedBook[]>([])
  const [inspBookCounter, setInspBookCounter] = useState(0)
  const [inspCurrentBoxBooks, setInspCurrentBoxBooks] = useState(0)
  const [loadingInspSession, setLoadingInspSession] = useState(false)
  const [inspConfirmComplete, setInspConfirmComplete] = useState(false)
  const [inspTotalBooksExpected, setInspTotalBooksExpected] = useState('')
  const [inspIssueIsbn, setInspIssueIsbn] = useState('')
  const [inspIssueType, setInspIssueType] = useState<'missing' | 'extra'>('missing')
  const [inspIssues, setInspIssues] = useState<Array<{ isbn: string; type: 'missing' | 'extra'; title?: string; author?: string }>>([])
  const [inspFetchingIssueBook, setInspFetchingIssueBook] = useState(false)
  const [inspFlagModalBook, setInspFlagModalBook] = useState<InspScannedBook | null>(null)
  const [inspFlagIssue, setInspFlagIssue] = useState('')
  const [inspFlagRemarks, setInspFlagRemarks] = useState('')
  const [inspFlagSaving, setInspFlagSaving] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await fetchUserProfile()
      if (profile?.name) setInspUserName(profile.name)
    }
    loadProfile()
  }, [])

  const handleStartInspSession = async (boxId: string) => {
    const box = inspectionBoxes.find(b => b.id === boxId)
    if (!box) return
    setLoadingInspSession(true)
    try {
      const res = await authFetch(`${API_URL}/api/warehouse/sessions/start`, {
        method: 'POST',
        body: JSON.stringify({
          lot_number: box.lot?.lot_number || '',
          box_id: box.id,
          box_number: box.box_number,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start session')
      setInspCurrentSession({ ...data.session, total_processable: 0, total_non_processable: 0 })
      setInspBox(box)
      setInspScannedBooks([])
      setInspBookCounter(0)
      setInspCurrentBoxBooks(0)
      setInspTotalBooksExpected('')
      setInspIssueIsbn('')
      setInspIssues([])
      setInspSessionActive(true)
      toast.success(`Session started for ${box.box_number}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start inspection session')
    } finally {
      setLoadingInspSession(false)
    }
  }

  const handleInspScan = async (isbn: string) => {
    if (!inspCurrentSession) return
    setLoadingInspSession(true)
    try {
      const res = await authFetch(`${API_URL}/api/books/ilms/search/${isbn}`)
      const data = await res.json()
      if (data.success && data.data && !data.data.Message) {
        addInspBookLocal({ isbn: data.data.ISBN || isbn, title: data.data.Title || `ISBN: ${isbn}`, author: data.data.Author || '' }, 'processable')
      } else {
        addInspBookLocal({ isbn, title: `Book ${inspBookCounter + 1}`, author: '' }, 'processable')
        toast.warning('ISBN not found in iLMS — added to log anyway.')
      }
    } catch {
      addInspBookLocal({ isbn, title: `Book ${inspBookCounter + 1}`, author: '' }, 'processable')
      toast.error('API error — added to log anyway.')
    } finally {
      setLoadingInspSession(false)
    }
  }

  const addInspBookLocal = (bookData: { isbn: string; title: string; author: string }, scan_status: 'processable' | 'non_processable') => {
    if (!inspCurrentSession) return
    setInspCurrentBoxBooks(p => p + 1)
    setInspBookCounter(p => p + 1)
    const newBook: InspScannedBook = {
      id: `local-${Date.now()}`,
      isbn: bookData.isbn,
      title: bookData.title,
      author: bookData.author,
      scan_status,
      timestamp: new Date(),
    }
    setInspScannedBooks(prev => [newBook, ...prev])
    setInspCurrentSession(prev => prev ? {
      ...prev,
      total_scanned: prev.total_scanned + 1,
      total_processable: scan_status === 'processable' ? prev.total_processable + 1 : prev.total_processable,
      total_non_processable: scan_status === 'non_processable' ? prev.total_non_processable + 1 : prev.total_non_processable,
    } : null)
  }

  const saveInspBookToDB = async (book: InspScannedBook) => {
    if (!inspCurrentSession) return
    const res = await authFetch(`${API_URL}/api/warehouse/sessions/${inspCurrentSession.id}/scan`, {
      method: 'POST',
      body: JSON.stringify({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        scan_status: book.scan_status,
        rejection_reason: book.flag_issue || null,
        notes: book.flag_remarks || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save book')
    return data.scanLog?.id
  }

  const handleRemoveInspBook = (bookId: string) => {
    const book = inspScannedBooks.find(b => b.id === bookId)
    if (!book) return
    setInspScannedBooks(prev => prev.filter(b => b.id !== bookId))
    setInspCurrentBoxBooks(p => Math.max(0, p - 1))
    setInspBookCounter(p => Math.max(0, p - 1))
    setInspCurrentSession(prev => prev ? {
      ...prev,
      total_scanned: Math.max(0, prev.total_scanned - 1),
      total_processable: book.scan_status === 'processable' ? Math.max(0, prev.total_processable - 1) : prev.total_processable,
      total_non_processable: book.scan_status === 'non_processable' ? Math.max(0, prev.total_non_processable - 1) : prev.total_non_processable,
    } : null)
  }

  const openInspFlagModal = (book: InspScannedBook) => {
    setInspFlagModalBook(book)
    setInspFlagIssue(book.flag_issue || '')
    setInspFlagRemarks(book.flag_remarks || '')
  }

  const saveInspFlagFromLog = () => {
    if (!inspFlagModalBook || !inspFlagIssue) { toast.error('Select an issue first'); return }
    setInspFlagSaving(true)
    setInspScannedBooks(prev => prev.map(b => b.id === inspFlagModalBook.id
      ? { ...b, scan_status: 'non_processable', flag_issue: inspFlagIssue, flag_remarks: inspFlagRemarks }
      : b
    ))
    setInspCurrentSession(prev => prev ? {
      ...prev,
      total_non_processable: prev.total_non_processable + 1,
      total_processable: Math.max(0, prev.total_processable - 1),
    } : null)
    setInspFlagModalBook(null)
    toast.success('Flagged as Non-Processable')
    setInspFlagSaving(false)
  }

  const handleAddInspIssue = async () => {
    if (!inspIssueIsbn.trim()) return

    if (inspScannedBooks.some(b => b.isbn === inspIssueIsbn.trim())) {
      toast.error('This book was already scanned successfully in this session.')
      setInspIssueIsbn('')
      return
    }
    
    if (inspIssues.some(i => i.isbn === inspIssueIsbn.trim())) {
      toast.error('This issue has already been added.')
      setInspIssueIsbn('')
      return
    }

    setInspFetchingIssueBook(true)
    try {
      const res = await authFetch(`${API_URL}/api/books/ilms/search/${inspIssueIsbn}`)
      const data = await res.json()
      setInspIssues(prev => [...prev, {
        isbn: inspIssueIsbn,
        type: inspIssueType,
        title: data.success && data.data && !data.data.Message ? data.data.Title : `Book ${inspBookCounter + 1}`,
        author: data.success && data.data && !data.data.Message ? data.data.Author : '',
      }])
      setInspIssueIsbn('')
    } catch {
      setInspIssues(prev => [...prev, { isbn: inspIssueIsbn, type: inspIssueType }])
      setInspIssueIsbn('')
    } finally {
      setInspFetchingIssueBook(false)
    }
  }

  const handleResetInspSession = () => {
    if (!inspCurrentSession) return
    setInspSessionActive(false)
    setInspBox(null)
    setInspCurrentSession(null)
    setInspScannedBooks([])
    setInspBookCounter(0)
    setInspCurrentBoxBooks(0)
    setInspTotalBooksExpected('')
    setInspIssueIsbn('')
    setInspIssues([])
    setInspConfirmComplete(false)
    toast.success('Session reset — scanned data was not saved.')
  }

  const handleOpenInspComplete = () => {
    if (!inspCurrentSession) return
    if (inspScannedBooks.length === 0) { toast.error('Scan at least one book before completing.'); return }
    setInspTotalBooksExpected('')
    setInspIssueIsbn('')
    setInspIssueType('missing')
    setInspIssues([])
    setInspConfirmComplete(true)
  }

  const handleCompleteInspSession = async () => {
    if (!inspCurrentSession || !inspBox) return
    if (!inspTotalBooksExpected.trim()) { toast.error('Enter the total books expected.'); return }
    setLoadingInspSession(true)
    try {
      for (const book of inspScannedBooks) {
        await saveInspBookToDB(book)
      }
      await authFetch(`${API_URL}/api/warehouse/sessions/${inspCurrentSession.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          expected: parseInt(inspTotalBooksExpected),
          stage: 'qa',
          issues: inspIssues,
        }),
      })
      // Mark box as ready to send → outgoing tab
      setOutgoingReadyIds(prev => new Set([...prev, inspBox.id]))
      setInspSessionActive(false)
      setInspBox(null)
      setInspCurrentSession(null)
      setInspScannedBooks([])
      setInspBookCounter(0)
      setInspCurrentBoxBooks(0)
      setInspTotalBooksExpected('')
      setInspIssueIsbn('')
      setInspIssues([])
      setInspConfirmComplete(false)
      setActiveTab('outgoing')
      toast.success('Inspection session completed.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete session')
    } finally {
      setLoadingInspSession(false)
    }
  }

  const lastUpdateLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
    : 'Not updated yet'

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar navigationLocked={inspSessionActive} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardNavbar disableBrandToggle={inspSessionActive} navigationLocked={inspSessionActive} />
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="flex flex-col gap-6 p-6 lg:p-8">

            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Book Inspection &amp; Endorsement</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receive boxes from Cut, inspect and scan books, then send to Scan.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { fetchIncoming(); fetchEndorsementBoxes() }}
                  disabled={loadingIncoming || loadingEndorsement}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${(loadingIncoming || loadingEndorsement) ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{lastUpdateLabel}</p>
              </div>
            </header>

            {/* ── Tab Navigation ── */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
              {([
                { key: 'incoming',   label: 'Incoming Boxes',  icon: Inbox,          count: incomingBoxes.length,   activeColor: 'bg-orange-100 text-orange-700' },
                { key: 'inspection', label: 'Book Inspection', icon: ClipboardCheck, count: inspectionBoxes.length, activeColor: 'bg-amber-100 text-amber-700' },
                { key: 'outgoing',   label: 'Outgoing Boxes',  icon: Send,           count: outgoingBoxes.length,   activeColor: 'bg-emerald-100 text-emerald-700' },
              ] as const).map(({ key, label, icon: Icon, count, activeColor }) => (
                <button
                  key={key}
                  disabled={inspSessionActive}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${activeTab === key ? activeColor : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB: INCOMING BOXES (from Cut)                                   */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'incoming' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  {loadingIncoming ? 'Loading…' : `${incomingBoxes.length} box${incomingBoxes.length !== 1 ? 'es' : ''} arriving from Cut`}
                </p>
                {loadingIncoming ? (
                  <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading boxes…
                  </div>
                ) : incomingBoxes.length === 0 ? (
                  <div className="py-20 flex flex-col items-center gap-3 text-center">
                    <div className="bg-orange-50 rounded-full p-5"><Inbox className="h-8 w-8 text-orange-400" /></div>
                    <p className="text-sm font-semibold text-foreground">No incoming boxes</p>
                    <p className="text-xs text-muted-foreground max-w-xs">Boxes advanced from the Cut stage will appear here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {incomingBoxes.map(box => (
                      <div key={box.id} className="border border-border rounded-xl bg-card flex items-center px-4 py-3 gap-4">
                        <div className="bg-orange-50 rounded-lg p-2 shrink-0">
                          <Package className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                          <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {box.total_books_expected || 0} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                          {box.box_sessions?.[0]?.started_at ? new Date(box.box_sessions[0].started_at).toLocaleDateString() : ''}
                        </span>
                        <button
                          onClick={() => handleReceiveBox(box)}
                          disabled={receivingBox === box.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 transition-colors shrink-0"
                        >
                          {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {receivingBox === box.id ? 'Receiving…' : 'Received'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB: BOOK INSPECTION (session-based, mirrors Book Verification)  */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'inspection' && (
              <div className="flex flex-col gap-4">

                {/* ── Complete Session Modal ── */}
                {inspConfirmComplete && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInspConfirmComplete(false)}>
                    <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <h3 className="text-base font-semibold text-foreground mb-4">Complete Inspection</h3>

                      {/* Total Books Expected */}
                      <div className="mb-4">
                        <div className="flex items-center gap-1 mb-1">
                          <label className="text-sm font-medium text-foreground">Total Books Expected</label>
                          <span className="text-sm font-medium text-red-500">*</span>
                        </div>
                        <input
                          type="number"
                          value={inspTotalBooksExpected}
                          onChange={e => setInspTotalBooksExpected(e.target.value)}
                          placeholder="Enter expected total count"
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      {/* Discrepancies */}
                      <div className="mb-4">
                        <label className="text-sm font-medium text-foreground mb-2 block">Discrepancies (Missing/Extra Books)</label>
                        <div className="flex gap-2 mb-3">
                          <Select value={inspIssueType} onValueChange={v => setInspIssueType(v as 'missing' | 'extra')}>
                            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="missing">Missing</SelectItem>
                              <SelectItem value="extra">Extra</SelectItem>
                            </SelectContent>
                          </Select>
                          <input
                            type="text"
                            value={inspIssueIsbn}
                            onChange={e => setInspIssueIsbn(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && inspIssueIsbn.trim()) handleAddInspIssue() }}
                            placeholder="Scan or Input ISBN — book details will auto-fetch"
                            className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            onClick={handleAddInspIssue}
                            disabled={!inspIssueIsbn.trim() || inspFetchingIssueBook}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm disabled:opacity-50"
                          >
                            {inspFetchingIssueBook ? 'Adding…' : 'Add'}
                          </button>
                        </div>
                        {inspIssues.length > 0 && (
                          <div className="space-y-1.5 mb-3">
                            {inspIssues.map((issue, idx) => (
                              <div key={`${issue.isbn}-${idx}`} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${issue.type === 'missing' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {issue.type === 'missing' ? 'Missing' : 'Extra'}
                                  </span>
                                  <span className="text-xs font-medium text-foreground">{issue.isbn}</span>
                                  <span className="text-[11px] text-muted-foreground">{issue.title}</span>
                                </div>
                                <button onClick={() => setInspIssues(prev => prev.filter(i => i.isbn !== issue.isbn))} className="text-[10px] text-muted-foreground hover:text-destructive underline">Remove</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                        <span className="font-medium">Expected:</span> {inspTotalBooksExpected || 0} books
                        <span className="ml-3"><span className="font-medium">Scanned:</span> {inspCurrentSession?.total_scanned || 0} books</span>
                        {inspIssues.length > 0 && (
                          <span className="ml-3"><span className="font-medium">Issues:</span> {inspIssues.length} ({inspIssues.filter(i => i.type === 'missing').length} missing, {inspIssues.filter(i => i.type === 'extra').length} extra)</span>
                        )}
                        <p className="text-[10px] mt-1">* All scanned books will be saved when you confirm.</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setInspConfirmComplete(false); setInspTotalBooksExpected(''); setInspIssueIsbn(''); setInspIssues([]) }}
                          className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                        <button onClick={handleCompleteInspSession} disabled={loadingInspSession}
                          className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50">
                          {loadingInspSession ? 'Completing…' : 'Confirm Complete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Flag Modal ── */}
                {inspFlagModalBook && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInspFlagModalBook(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" /> Flag as Non-Processable
                        </h3>
                        <button onClick={() => setInspFlagModalBook(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{inspFlagModalBook.isbn} — {inspFlagModalBook.title} — {inspFlagModalBook.author}</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-foreground mb-1 block">Issue</label>
                          <select value={inspFlagIssue} onChange={e => setInspFlagIssue(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">Select issue…</option>
                            {FLAG_ISSUES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-foreground mb-1 block">Remarks / Page No. (optional)</label>
                          <input type="text" value={inspFlagRemarks} onChange={e => setInspFlagRemarks(e.target.value)}
                            placeholder="e.g. page 42"
                            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end mt-4">
                        <button onClick={() => setInspFlagModalBook(null)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                        <button onClick={saveInspFlagFromLog} disabled={!inspFlagIssue || inspFlagSaving}
                          className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium disabled:opacity-50">
                          {inspFlagSaving ? 'Saving…' : 'Confirm Flag'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!inspSessionActive ? (
                  /* ── Box list ── */
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground">
                      {loadingEndorsement ? 'Loading…' : `${inspectionBoxes.length} box${inspectionBoxes.length !== 1 ? 'es' : ''} awaiting inspection`}
                    </p>
                    {loadingEndorsement ? (
                      <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading boxes…
                      </div>
                    ) : inspectionBoxes.length === 0 ? (
                      <div className="py-20 flex flex-col items-center gap-3 text-center">
                        <div className="bg-amber-50 rounded-full p-5"><ClipboardCheck className="h-8 w-8 text-amber-400" /></div>
                        <p className="text-sm font-semibold text-foreground">No boxes to inspect</p>
                        <p className="text-xs text-muted-foreground max-w-xs">Receive boxes from the Incoming Boxes tab first.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {inspectionBoxes.map(box => {
                          const isExpanded = inspExpandedBoxId === box.id
                          const rowBooks = inspRowBooks[box.id] || []
                          const isLoadingBooks = loadingInspRowBooks === box.id
                          return (
                            <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden">
                              <div className="flex items-center px-4 py-3 gap-4">
                                <button onClick={() => toggleInspRow(box.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                                <div className="bg-amber-50 rounded-lg p-2 shrink-0">
                                  <Package className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleInspRow(box.id)}>
                                  <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                  <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {box.total_books_expected || 0} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                                  {box.box_sessions?.[0]?.started_at ? new Date(box.box_sessions[0].started_at).toLocaleDateString() : ''}
                                </span>
                                <button
                                  onClick={() => handleStartInspSession(box.id)}
                                  disabled={loadingInspSession}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors shrink-0"
                                >
                                  {loadingInspSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                                  {loadingInspSession ? 'Starting…' : 'Start Session'}
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="border-t border-border px-5 py-3 bg-muted/30">
                                  {isLoadingBooks ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
                                    </div>
                                  ) : rowBooks.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
                                  ) : (
                                    <div className="flex flex-col">
                                      <p className="text-xs font-medium text-muted-foreground mb-2">{rowBooks.length} book{rowBooks.length !== 1 ? 's' : ''} in this box</p>
                                      {rowBooks.map((book, idx) => (
                                        <div key={book.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/40 last:border-0">
                                          <span className="text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                                          <span className="font-mono text-foreground w-32 shrink-0">{book.isbn}</span>
                                          <span className="flex-1 text-muted-foreground truncate">{book.title || '—'}</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {book.scan_status}
                                          </span>
                                        </div>
                                      ))}
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
                ) : inspBox && (
                  <>
                    {/* ── Active session bar ── */}
                    <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4">
                      <div className="flex items-center gap-4">
                        <Package className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Active Lot</p>
                          <p className="text-sm font-semibold text-foreground">{inspBox.lot?.lot_number || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Current Box</p>
                          <p className="text-sm font-semibold text-foreground">{inspBox.box_number} ({inspCurrentBoxBooks} books)</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">User</p>
                          <p className="text-sm font-semibold text-foreground">{inspUserName || 'Unknown User'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleResetInspSession}
                          className="px-4 py-1.5 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors">
                          Reset Session
                        </button>
                        <button onClick={handleOpenInspComplete} disabled={loadingInspSession || inspScannedBooks.length === 0}
                          className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          Complete Session
                        </button>
                      </div>
                    </div>

                    {/* ── Stats cards ── */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium">Total Scanned</p>
                        <p className="text-2xl font-bold text-blue-900">{inspCurrentSession?.total_scanned || 0}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-600 font-medium">Processable</p>
                        <p className="text-2xl font-bold text-green-900">{inspCurrentSession?.total_processable || 0}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs text-red-600 font-medium">Non-Processable</p>
                        <p className="text-2xl font-bold text-red-900">{inspCurrentSession?.total_non_processable || 0}</p>
                      </div>
                    </div>

                    {/* ── Scanner ── */}
                    <ScannerInput onScan={handleInspScan} />

                    {/* ── Scan log ── */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Scan Log</h3>
                      {inspScannedBooks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No books scanned yet.</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                            <div className="col-span-2">ISBN</div>
                            <div className="col-span-3">Book Title</div>
                            <div className="col-span-3">Book Author</div>
                            <div className="col-span-3 text-right">Status</div>
                            <div className="col-span-1 text-right">Action</div>
                          </div>
                          <div className="space-y-1.5 max-h-96 overflow-y-auto">
                            {inspScannedBooks.map((book, idx) => (
                              <div key={`${book.id}-${idx}`} className="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors items-center">
                                <div className="col-span-2">
                                  <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                                </div>
                                <div className="col-span-3">
                                  <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>
                                  {book.flag_issue && (
                                    <p className="text-[10px] text-red-500 mt-0.5">{issueLabel(book.flag_issue)}{book.flag_remarks ? ` — ${book.flag_remarks}` : ''}</p>
                                  )}
                                </div>
                                <div className="col-span-3">
                                  <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
                                </div>
                                <div className="col-span-3 flex items-center justify-end gap-2">
                                  {book.scan_status === 'processable' ? (
                                    <>
                                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700">Processable</span>
                                      <button onClick={() => openInspFlagModal(book)} className="text-[10px] text-muted-foreground hover:text-destructive underline">Flag</button>
                                    </>
                                  ) : (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">
                                      <AlertTriangle className="h-2.5 w-2.5" /> Non-Processable
                                    </span>
                                  )}
                                </div>
                                <div className="col-span-1 flex items-center justify-end">
                                  <button onClick={() => handleRemoveInspBook(book.id)}
                                    className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors" title="Remove">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB: OUTGOING BOXES (send to Scan)                               */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'outgoing' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  {`${outgoingBoxes.length} box${outgoingBoxes.length !== 1 ? 'es' : ''} ready to send to Scan`}
                </p>
                {outgoingBoxes.length === 0 ? (
                  <div className="py-20 flex flex-col items-center gap-3 text-center">
                    <div className="bg-emerald-50 rounded-full p-5"><Send className="h-8 w-8 text-emerald-400" /></div>
                    <p className="text-sm font-semibold text-foreground">No outgoing boxes yet</p>
                    <p className="text-xs text-muted-foreground max-w-xs">Complete an inspection session in the Book Inspection tab to add boxes here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {outgoingBoxes.map(box => (
                      <div key={box.id} className="border border-border rounded-xl bg-card flex items-center px-4 py-3 gap-4">
                        <div className="bg-emerald-50 rounded-lg p-2 shrink-0">
                          <Package className="h-5 w-5 text-emerald-600" />
                        </div>
                            <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Endorsed</span>
                          </div>
                          <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {box.total_books_expected || 0} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                        </div>
                        <button
                          onClick={() => handleSendToScan(box)}
                          disabled={sendingToScan === box.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shrink-0"
                        >
                          {sendingToScan === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {sendingToScan === box.id ? 'Sending…' : 'Send to Scan'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
