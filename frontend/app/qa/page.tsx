"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch, fetchUserProfile } from "@/lib/auth-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useBrand } from "@/hooks/use-brand"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScannerInput } from "@/components/scanner-input"
import {
  AlertTriangle, ChevronDown, ChevronRight, RefreshCw, CheckCircle2,
  Inbox, ClipboardCheck, Send, Package, BookOpen, Loader2, Trash2, ClipboardList,
} from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"

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
  latest_endorsement_scan_at?: string | null
  box_sessions?: { 
    warehouse_time_received?: string
    cut_time_send?: string
    endorsement_time_received?: string
    status?: string
    total_scanned?: number
    updated_at?: string
  }[]
}

interface BoxBookEntry {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  flag?: { issue: string; remarks: string }
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

interface WarehouseBook {
  id: string
  isbn: string
  title: string
  scan_status: string
  rejection_reason: string | null
  warehouse_scan_at: string
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
  const { brand } = useBrand()

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'incoming' | 'inspection' | 'outgoing'>('incoming')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ── Incoming Boxes (cut stage) ──────────────────────────────────────────────
  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [loadingIncoming, setLoadingIncoming] = useState(true)
  const [receivingBox, setReceivingBox] = useState<string | null>(null)

  const fetchIncoming = useCallback(async () => {
    setLoadingIncoming(true)
    try {
      const res = await authFetch(`${API_URL}/api/boxes?current_stage=cut&box_type=${brand}`)
      const data = await res.json()
      const filteredIncoming = (data.boxes || []).filter((b: BoxEntry) => {
         return b.box_sessions?.some(s => s.status === 'sent')
      })
      setIncomingBoxes(filteredIncoming)
    } catch (e) {
      console.error('Failed to fetch incoming boxes:', e)
    } finally {
      setLoadingIncoming(false)
    }
  }, [brand])

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
    setLoadingEndorsement(true)
    try {
      const res = await authFetch(`${API_URL}/api/boxes?current_stage=endorsement&box_type=${brand}`)
      const data = await res.json()
      if (data.boxes) {
        const filteredEndorsement = data.boxes.filter((b: BoxEntry) => {
          return !b.box_sessions?.some(s => s.status === 'sent')
        })
        setEndorsementBoxes(filteredEndorsement)
      }
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch endorsement boxes:', e)
    } finally {
      setLoadingEndorsement(false)
    }
  }, [brand])

  useEffect(() => {
    fetchIncoming()
    fetchEndorsementBoxes()
  }, [fetchIncoming, fetchEndorsementBoxes])

  // ── Outgoing Boxes (endorsed → send to Scan) ────────────────────────────────
  // Derived from session status (not in-memory state), so it survives page refresh
  const [sendingToScan, setSendingToScan] = useState<string | null>(null)

  const outgoingBoxes = endorsementBoxes.filter(b => b.box_sessions?.some(s => s.status === 'completed'))
  const inspectionBoxes = endorsementBoxes.filter(b => !b.box_sessions?.some(s => s.status === 'completed'))

  const handleSendToScan = async (box: BoxEntry) => {
    setSendingToScan(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/send-forward`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Sent to Scan from Book Inspection & Endorsement' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send to scan')
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

  // ── Incoming and Outgoing Expandable Rows ─────────────────────────────
  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BoxBookEntry[]>>({})
  const [loadingBoxBooks, setLoadingBoxBooks] = useState<string | null>(null)

  const toggleBox = async (boxId: string) => {
    if (expandedBoxId === boxId) { setExpandedBoxId(null); return }
    setExpandedBoxId(boxId)
    if (!boxBooks[boxId]) {
      setLoadingBoxBooks(boxId)
      try {
        const res = await authFetch(`${API_URL}/api/boxes/${boxId}`)
        const data = await res.json()
        setBoxBooks(prev => ({ ...prev, [boxId]: data.box?.books || [] }))
      } catch {
        setBoxBooks(prev => ({ ...prev, [boxId]: [] }))
      } finally {
        setLoadingBoxBooks(null)
      }
    }
  }

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
  const [inspUserId, setInspUserId] = useState('')
  const [inspCurrentSession, setInspCurrentSession] = useState<InspSession | null>(null)
  const [inspScannedBooks, setInspScannedBooks] = useState<InspScannedBook[]>([])
  const [inspBookCounter, setInspBookCounter] = useState(0)
  const [inspCurrentBoxBooks, setInspCurrentBoxBooks] = useState(0)
  const [loadingInspSession, setLoadingInspSession] = useState(false)
  const [inspConfirmComplete, setInspConfirmComplete] = useState(false)
  const [inspFlagModalBook, setInspFlagModalBook] = useState<InspScannedBook | null>(null)
  const [inspFlagIssue, setInspFlagIssue] = useState('')
  const [inspFlagRemarks, setInspFlagRemarks] = useState('')
  const [inspFlagSaving, setInspFlagSaving] = useState(false)

  const [warehouseBooks, setWarehouseBooks] = useState<WarehouseBook[]>([])
  const [loadingWarehouseBooks, setLoadingWarehouseBooks] = useState(false)

  const fetchWarehouseBooks = async (boxId: string) => {
    setLoadingWarehouseBooks(true)
    try {
      const res = await authFetch(`${API_URL}/api/warehouse/boxes/${boxId}/scans`)
      const data = await res.json()
      
      if (res.ok && data.success) {
        setWarehouseBooks(data.warehouse_books || [])
      } else {
        console.error('Failed to fetch warehouse books:', data.error)
        setWarehouseBooks([])
      }
    } catch (e) {
      console.error('Error fetching warehouse books:', e)
      setWarehouseBooks([])
    } finally {
      setLoadingWarehouseBooks(false)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await fetchUserProfile()
      if (profile?.name) setInspUserName(profile.name)
      if (profile?.id) setInspUserId(profile.id)
    }
    loadProfile()
  }, [])

  const handleStartInspSession = async (boxId: string) => {
    const box = inspectionBoxes.find(b => b.id === boxId)
    if (!box) return
    setLoadingInspSession(true)
    try {
      const res = await authFetch(`${API_URL}/api/warehouse/boxes/${box.id}/resume-session`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start session')
      setInspCurrentSession({ ...data.session, total_scanned: 0, total_processable: 0, total_non_processable: 0 })
      setInspBox(box)
      setInspScannedBooks([])
      setInspBookCounter(0)
      setInspCurrentBoxBooks(0)
      setInspSessionActive(true)
      fetchWarehouseBooks(box.id)
      toast.success(`Session started for ${box.box_number}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start inspection session')
    } finally {
      setLoadingInspSession(false)
    }
  }

  const handleInspScan = async (isbn: string) => {
    if (!inspCurrentSession) return

    const cleanedIsbn = isbn.trim()
    if (inspScannedBooks.some(b => b.isbn.trim().toLowerCase() === cleanedIsbn.toLowerCase())) {
      toast.error('This book has already been scanned in this session.')
      return
    }

    const prevStatus = (warehouseBooks.find(wb => wb.isbn.trim().toLowerCase() === cleanedIsbn.toLowerCase())?.scan_status ?? 'processable') as 'processable' | 'non_processable'

    setLoadingInspSession(true)
    try {
      const res = await authFetch(`${API_URL}/api/books/ilms/search/${isbn}`)
      const data = await res.json()
      if (data.success && data.data && !data.data.Message) {
        addInspBookLocal({ isbn: data.data.ISBN || isbn, title: data.data.Title || `ISBN: ${isbn}`, author: data.data.Author || '' }, prevStatus)
      } else {
        addInspBookLocal({ isbn, title: `Book ${inspBookCounter + 1}`, author: '' }, prevStatus)
        toast.warning('ISBN not found in iLMS — added to log anyway.')
      }
    } catch {
      addInspBookLocal({ isbn, title: `Book ${inspBookCounter + 1}`, author: '' }, prevStatus)
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

  const handleResetInspSession = () => {
    if (!inspCurrentSession) return
    setInspSessionActive(false)
    setInspBox(null)
    setInspCurrentSession(null)
    setInspScannedBooks([])
    setInspBookCounter(0)
    setInspCurrentBoxBooks(0)
    setInspConfirmComplete(false)
    toast.success('Session reset — scanned data was not saved.')
  }

  const handleOpenInspComplete = () => {
    if (!inspCurrentSession) return
    if (inspScannedBooks.length === 0) { toast.error('Scan at least one book before completing.'); return }
    setInspConfirmComplete(true)
  }

  const handleCompleteInspSession = async () => {
    if (!inspCurrentSession || !inspBox) return
    setLoadingInspSession(true)
    try {
      for (const book of inspScannedBooks) {
        await saveInspBookToDB(book)
      }
      await authFetch(`${API_URL}/api/warehouse/sessions/${inspCurrentSession.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          expected: inspScannedBooks.length,
          stage: 'qa',
          issues: [],
        }),
      })
      // Refresh from DB so the box moves to outgoing tab based on real session status
      fetchEndorsementBoxes()
      setInspSessionActive(false)
      setInspBox(null)
      setInspCurrentSession(null)
      setInspScannedBooks([])
      setInspBookCounter(0)
      setInspCurrentBoxBooks(0)
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
    <div className={cn("flex min-h-dvh bg-background", `theme-${brand}`)}>
      <DashboardSidebar navigationLocked={inspSessionActive} />
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        <DashboardNavbar disableBrandToggle={inspSessionActive} navigationLocked={inspSessionActive} />
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">

            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Endorsement</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receive boxes from Cut, inspect and scan books, then send to Scan.
                </p>
              </div>
              <RefreshControl onRefresh={() => { fetchIncoming(); fetchEndorsementBoxes() }} refreshing={loadingIncoming || loadingEndorsement} lastUpdated={lastUpdated} storageKey="qa" className="hidden sm:flex" />
            </header>

            {/* ── Tab Navigation ── */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
              {([
                { key: 'incoming',   label: 'Incoming Boxes',  icon: Inbox,          count: incomingBoxes.length,   activeColor: 'bg-orange-100 text-orange-700' },
                { key: 'inspection', label: 'Endorsement', icon: ClipboardCheck, count: inspectionBoxes.length, activeColor: 'bg-amber-100 text-amber-700' },
                { key: 'outgoing',   label: 'Outgoing Boxes',  icon: Send,           count: outgoingBoxes.length,   activeColor: 'bg-emerald-100 text-emerald-700' },
              ] as const).map(({ key, label, icon: Icon, count, activeColor }) => (
                <button
                  key={key}
                  disabled={inspSessionActive}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === key
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${activeTab === key ? 'bg-background text-primary' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
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
                    {incomingBoxes.map(box => {
                      const isExpanded = expandedBoxId === box.id
                      const rowBooks = boxBooks[box.id] || []
                      const isLoadingBooks = loadingBoxBooks === box.id
                      const bookCount = box.box_sessions?.[0]?.total_scanned ?? box.total_books_expected ?? 0
                      return (
                        <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                          <div className="flex items-center px-4 py-3 gap-4">
                            <button onClick={() => toggleBox(box.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            <div className="bg-orange-50 rounded-lg p-2 shrink-0">
                              <Package className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleBox(box.id)}>
                              <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                              <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                            </div>
                            {box.box_sessions?.[0]?.cut_time_send && (
                              <div className="shrink-0 hidden sm:block text-right mr-2">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(box.box_sessions[0].cut_time_send).toLocaleDateString()}
                                </p>
                                <p className="text-[10px] text-muted-foreground/80">
                                  {new Date(box.box_sessions[0].cut_time_send).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </p>
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReceiveBox(box) }}
                              disabled={receivingBox === box.id}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 transition-colors shrink-0"
                            >
                              {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              {receivingBox === box.id ? 'Receiving…' : 'Received'}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-border px-5 py-3 bg-muted/30 max-h-[300px] overflow-y-auto">
                              {isLoadingBooks ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
                                </div>
                              ) : rowBooks.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
                              ) : (
                                <div className="flex flex-col gap-1 border-l-2 border-orange-200 pl-3">
                                  {rowBooks.map(book => (
                                    <div key={book.id} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                                      <div className="flex flex-col">
                                        <span className="text-xs font-medium text-foreground">{book.isbn}</span>
                                        {book.title && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{book.title}</span>}
                                      </div>
                                      <div className="flex gap-2 items-center">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                        </span>
                                      </div>
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

                      {/* Scan Log Summary */}
                      <div className="mb-4">
                        <label className="text-sm font-medium text-foreground mb-2 block">Scanned Books Summary</label>
                        <div className="max-h-80 overflow-y-auto border border-border rounded-lg bg-card divide-y divide-border">
                          {inspScannedBooks.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">No books scanned.</div>
                          ) : (
                            inspScannedBooks.map((book, idx) => (
                              <div key={`${book.id}-${idx}`} className="flex items-center gap-3 px-3 py-2 bg-muted/30">
                                <span className="text-xs font-semibold w-24 shrink-0">{book.isbn}</span>
                                <span className="text-[11px] truncate flex-1">{book.title}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          * Total {inspScannedBooks.length} scanned books will be saved to the database when you confirm.
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setInspConfirmComplete(false) }}
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
                      <p className="text-xs text-muted-foreground mb-3">{inspFlagModalBook.isbn} — {inspFlagModalBook.title}</p>
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
                                  <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {box.box_sessions?.[0]?.total_scanned ?? box.total_books_expected ?? 0} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                                  {box.box_sessions?.[0]?.endorsement_time_received ? new Date(box.box_sessions[0].endorsement_time_received).toLocaleString() : ''}
                                </span>
                                <button
                                  onClick={() => handleStartInspSession(box.id)}
                                  disabled={loadingInspSession}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors shrink-0"
                                >
                                  {loadingInspSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
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
                                            {book.scan_status === 'processable' ? 'Processable' : (book.flag?.issue ? `Non-Processable (${book.flag.issue})` : 'Non-Processable')}
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

                    {/* ── Side-by-Side Warehouse and Endorsement Tables ── */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Warehouse Table (Left) - Read Only */}
                      <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-semibold text-blue-600">Previous Scans (Inventory)</h3>
                          {loadingWarehouseBooks ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : (
                            <span className="text-xs text-muted-foreground">({warehouseBooks.length} books)</span>
                          )}
                        </div>
                        
                        {loadingWarehouseBooks ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : warehouseBooks.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-6 text-center">No previous scans found for this box.</p>
                        ) : (
                          <div className="overflow-y-auto max-h-96">
                            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                              <div className="col-span-2">ISBN</div>
                              <div className="col-span-6">Book Title</div>
                              <div className="col-span-3 text-right">Status</div>
                              <div className="col-span-1"></div>
                            </div>
                            <div className="space-y-1.5">
                              {warehouseBooks
                                .map((book) => {
                                  const endorsementBook = inspScannedBooks.find(ib => ib.isbn.trim().toLowerCase() === (book.isbn || '').trim().toLowerCase())
                                  const isMissing = book.rejection_reason === 'missing'
                                  const isMatch = isMissing || (endorsementBook && endorsementBook.scan_status === book.scan_status)
                                  return { book, isMatch, isMissing }
                                })
                                .sort((a, b) => {
                                  if (a.isMissing && !b.isMissing) return 1;
                                  if (!a.isMissing && b.isMissing) return -1;
                                  return (a.isMatch === b.isMatch ? 0 : a.isMatch ? -1 : 1)
                                })
                                .map(({ book, isMatch, isMissing }, i) => (
                                  <div key={i} className={`grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center ${
                                    isMissing ? 'bg-gray-100 border-gray-300 opacity-60' : isMatch ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                                  }`}>
                                    <div className="col-span-2">
                                      <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                                    </div>
                                    <div className="col-span-6">
                                      <p className="text-[11px] text-foreground truncate">{book.title}</p>
                                    </div>
                                    <div className="col-span-3 flex items-center justify-end">
                                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                                        book.scan_status === 'processable' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                      }`}>
                                        {book.scan_status === 'processable' ? 'Processable' : (book.rejection_reason === 'missing' || book.rejection_reason === 'extra') ? `Non-Processable (${book.rejection_reason.charAt(0).toUpperCase() + book.rejection_reason.slice(1)})` : 'Non-Processable'}
                                      </span>
                                    </div>
                                    <div className="col-span-1"></div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Endorsement Table (Right) - Editable */}
                      <div className="bg-card border-2 border-green-500 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-green-600" />
                            <h3 className="text-sm font-semibold text-green-600">Endorsement Scans</h3>
                            <span className="text-xs text-muted-foreground">({inspScannedBooks.length} books)</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium border border-green-200">
                            Currently Endorsing
                          </span>
                        </div>
                        
                        {inspScannedBooks.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-6 text-center">No books scanned yet.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                              <div className="col-span-3">ISBN</div>
                              <div className="col-span-5">Book Title</div>
                              <div className="col-span-3 text-right">Status</div>
                              <div className="col-span-1 text-right"></div>
                            </div>
                            <div className="space-y-1.5 max-h-96 overflow-y-auto">
                              {inspScannedBooks.map((book, idx) => (
                                <div key={`${book.id}-${idx}`} className="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors items-center">
                                  <div className="col-span-3">
                                    <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                                  </div>
                                  <div className="col-span-5">
                                    <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>
                                    {book.flag_issue && (
                                      <p className="text-[10px] text-red-500 mt-0.5">{issueLabel(book.flag_issue)}{book.flag_remarks ? ` — ${book.flag_remarks}` : ''}</p>
                                    )}
                                  </div>
                                  <div className="col-span-3 flex flex-row items-center justify-end gap-2">
                                    {book.scan_status === 'processable' ? (
                                      <>
                                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700 whitespace-nowrap">Processable</span>
                                        <button onClick={() => openInspFlagModal(book)} className="text-[10px] text-muted-foreground hover:text-destructive underline whitespace-nowrap">Flag Issue</button>
                                      </>
                                    ) : (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700 text-right whitespace-nowrap">
                                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Non-Processable
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
                    {outgoingBoxes.map(box => {
                      const isExpanded = expandedBoxId === box.id
                      const rowBooks = boxBooks[box.id] || []
                      const isLoadingBooks = loadingBoxBooks === box.id
                      const bookCount = box.box_sessions?.[0]?.total_scanned ?? box.total_books_expected ?? 0
                      return (
                        <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                          <div className="flex items-center px-4 py-3 gap-4">
                            <button onClick={() => toggleBox(box.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            <div className="bg-emerald-50 rounded-lg p-2 shrink-0">
                              <Package className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleBox(box.id)}>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Endorsed</span>
                              </div>
                              <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                            </div>
                            {(box.latest_endorsement_scan_at || box.box_sessions?.[0]?.updated_at) && (
                              <div className="shrink-0 flex flex-col items-end gap-0.5 mr-2">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(box.latest_endorsement_scan_at || box.box_sessions?.[0]?.updated_at as string).toLocaleDateString()}
                                </span>
                                <span className="text-[10px] text-muted-foreground/80">
                                  {new Date(box.latest_endorsement_scan_at || box.box_sessions?.[0]?.updated_at as string).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSendToScan(box) }}
                              disabled={sendingToScan === box.id}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shrink-0"
                            >
                              {sendingToScan === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              {sendingToScan === box.id ? 'Sending…' : 'Send to Scan'}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-border px-5 py-3 bg-muted/30 max-h-[300px] overflow-y-auto">
                              {isLoadingBooks ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
                                </div>
                              ) : rowBooks.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
                              ) : (
                                <div className="flex flex-col gap-1 border-l-2 border-emerald-200 pl-3">
                                  {rowBooks.map(book => (
                                    <div key={book.id} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                                      <div className="flex flex-col">
                                        <span className="text-xs font-medium text-foreground">{book.isbn}</span>
                                        {book.title && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{book.title}</span>}
                                      </div>
                                      <div className="flex gap-2 items-center">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                        </span>
                                      </div>
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
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
