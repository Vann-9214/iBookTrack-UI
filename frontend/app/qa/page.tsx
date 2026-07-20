"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch, fetchUserProfile } from "@/lib/auth-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useBrand } from "@/hooks/use-brand"
import { useIsMobile } from "@/components/ui/use-mobile"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { ScannerInput } from "@/components/scanner-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ChevronDown, ChevronRight, CheckCircle2,
  Inbox, ClipboardCheck, Send, Package, BookOpen, Loader2, Trash2, ClipboardList,
  ScanBarcode, CircleCheck, CircleX, Search, X, CheckCircle } from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

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
  total_expected_books: number

  lot: { lot_number: string } | null
  latest_endorsement_scan_at?: string | null
  box_sessions?: { 
    warehouse_time_received?: string
    cut_time_send?: string
    endorsement_time_received?: string
    status?: string
    total_scanned_books?: number
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
  total_scanned_books: number
  total_processable: number
  total_non_processable: number
  box_id?: string | null
}

const issueLabel = (val: string) => FLAG_ISSUES.find(i => i.value === val)?.label || val

export default function BookInspectionPage() {
  const { brand, colors } = useBrand()
  const isMobile = useIsMobile()

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'incoming' | 'inspection' | 'outgoing'>('incoming')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'box' | 'lot' | 'isbn'>('box')

  // ── Incoming Boxes (cut stage) ──────────────────────────────────────────────
  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [loadingIncoming, setLoadingIncoming] = useState(true)
  const [receivingBox, setReceivingBox] = useState<string | null>(null)

  const fetchIncoming = useCallback(async () => {
    setLoadingIncoming(true)
    try {
      const params = new URLSearchParams()
      params.append('current_stage', 'cut')
      params.append('box_type', brand)
      const query = searchQuery.trim()
      if (query) {
        if (searchType === 'box') params.append('box_number', query)
        if (searchType === 'isbn') params.append('isbn', query)
      }
      const res = await authFetch(`${API_URL}/api/boxes?${params.toString()}`)
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
  }, [brand, searchQuery, searchType])

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
      const params = new URLSearchParams()
      params.append('current_stage', 'endorsement')
      params.append('box_type', brand)
      const query = searchQuery.trim()
      if (query) {
        if (searchType === 'box') params.append('box_number', query)
        if (searchType === 'isbn') params.append('isbn', query)
      }
      const res = await authFetch(`${API_URL}/api/boxes?${params.toString()}`)
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
  }, [brand, searchQuery, searchType])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncoming()
      fetchEndorsementBoxes()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchIncoming, fetchEndorsementBoxes])

  // ── Outgoing Boxes (endorsed → send to Scan) ────────────────────────────────
  // Derived from session status (not in-memory state), so it survives page refresh
  const [sendingToScan, setSendingToScan] = useState<string | null>(null)

  const outgoingBoxes = endorsementBoxes.filter(b => b.box_sessions?.some(s => s.status === 'completed'))
  const inspectionBoxes = endorsementBoxes.filter(b => !b.box_sessions?.some(s => s.status === 'completed'))

  const matchesLotSearch = (box: BoxEntry) => {
    if (searchType !== 'lot') return true
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    return (box.lot?.lot_number || '').toLowerCase().includes(query)
  }

  const filteredIncoming = incomingBoxes.filter(matchesLotSearch)
  const filteredInspection = inspectionBoxes.filter(matchesLotSearch)
  const filteredOutgoing = outgoingBoxes.filter(matchesLotSearch)

  const handleSendToScan = async (box: BoxEntry) => {
    setSendingToScan(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/send-forward`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Sent from Book Inspection & Endorsement' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send to scan')
      fetchEndorsementBoxes()
      toast.success(`${box.box_number} sent`)
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

  // ── Confirmation modal state ────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    action: 'receive' | 'start_session' | 'send_to_scan' | null
    box: BoxEntry | null
  }>({ open: false, action: null, box: null })

  const openConfirm = (action: 'receive' | 'start_session' | 'send_to_scan', box: BoxEntry) =>
    setConfirmModal({ open: true, action, box })
  const closeConfirm = () => setConfirmModal({ open: false, action: null, box: null })

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
      setInspCurrentSession({ ...data.session, total_scanned_books: 0, total_processable: 0, total_non_processable: 0 })
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

    const warehouseBook = warehouseBooks.find(wb => wb.isbn.trim().toLowerCase() === cleanedIsbn.toLowerCase());
    if (warehouseBook?.rejection_reason === 'missing') {
      toast.error('This book was marked as missing by the inventory guide and cannot be verified.')
      return
    }

    const prevStatus = (warehouseBook?.scan_status ?? 'processable') as 'processable' | 'non_processable'

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
      total_scanned_books: prev.total_scanned_books + 1,
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
        stage: 'endorsement'
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
      total_scanned_books: Math.max(0, prev.total_scanned_books - 1),
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

    const expectedWarehouseBooks = warehouseBooks.filter(wb => wb.rejection_reason !== 'missing');
    
    const missingBooks = expectedWarehouseBooks.filter(wb => !inspScannedBooks.some(vb => vb.isbn === wb.isbn));
    const extraBooks = inspScannedBooks.filter(vb => !expectedWarehouseBooks.some(wb => wb.isbn === vb.isbn));

    if (missingBooks.length > 0 || extraBooks.length > 0) {
      if (missingBooks.length > 0 && extraBooks.length > 0) {
        toast.error(`Mismatch: Missing ${missingBooks.length} expected book(s) and found ${extraBooks.length} extra book(s).`)
      } else if (missingBooks.length > 0) {
        toast.error(`Mismatch: You are missing ${missingBooks.length} expected book(s) from the Inventory guide.`)
      } else {
        toast.error(`Mismatch: You have ${extraBooks.length} extra book(s). Please remove them before completing.`)
      }
      return
    }

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
    <>
    <div className={cn("flex h-screen bg-background font-sans", `theme-${brand}`)}>
      <DashboardSidebar navigationLocked={inspSessionActive} />
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        <DashboardNavbar disableBrandToggle={inspSessionActive} navigationLocked={inspSessionActive} />
        <main className="ambient-bg flex-1 overflow-auto flex flex-col p-4 md:p-6 lg:p-8">
          <div className={cn("mx-auto w-full flex-1 flex flex-col", inspSessionActive ? "max-w-full" : "max-w-6xl")}>

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                  <CheckCircle className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
                    Endorsement Station
                  </h1>
                  <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                    Receive boxes from Cut, inspect books, then send to Scan for <span className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none", brand === 'jaguar' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600')}>{brand}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Search bar */}
            {!inspSessionActive && (
            <div className="flex items-center gap-2 mb-6">
              <Select value={searchType} onValueChange={(v) => setSearchType(v as 'box' | 'lot' | 'isbn')}>
                <SelectTrigger className="w-[130px] shrink-0 hover:text-primary-foreground hover:bg-primary transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="box">Box No.</SelectItem>
                  <SelectItem value="lot">Lot</SelectItem>
                  <SelectItem value="isbn">ISBN</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    let val = e.target.value
                    if (searchType === 'isbn') {
                      val = val.replace(/[^0-9a-zA-Z]/g, '').slice(0, 13)
                    }
                    setSearchQuery(val)
                  }}
                  inputMode="text"
                  maxLength={searchType === 'isbn' ? 13 : undefined}
                  placeholder={
                    searchType === 'isbn'
                      ? 'ISBN (10 or 13 characters)'
                      : searchType === 'lot'
                        ? 'Search by lot number…'
                        : 'Search by box number…'
                  }
                  className="w-full pl-9 pr-9 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            )}

            {/* ── Tab Navigation ── */}
            <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-px">
              <button
                disabled={inspSessionActive}
                onClick={() => setActiveTab('incoming')}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
                  activeTab === 'incoming'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Inbox className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Incoming</span>
                <span className={cn(
                  'ml-1.5 px-2 py-0.5 rounded-full text-xs',
                  activeTab === 'incoming' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>{filteredIncoming.length}</span>
              </button>
              <button
                disabled={inspSessionActive}
                onClick={() => setActiveTab('inspection')}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
                  activeTab === 'inspection'
                    ? 'bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                style={activeTab === 'inspection' ? {
                  borderBottomColor: colors.accent,
                  color: colors.accent,
                  backgroundColor: `${colors.accent}14`,
                } : undefined}
              >
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Endorsement</span>
                <span
                  className={cn(
                    'ml-1.5 px-2 py-0.5 rounded-full text-xs',
                    activeTab === 'inspection' ? '' : 'bg-muted text-muted-foreground'
                  )}
                  style={activeTab === 'inspection' ? {
                    backgroundColor: `${colors.accent}1A`,
                    color: colors.accent,
                  } : undefined}
                >{filteredInspection.length}</span>
              </button>
              <button
                disabled={inspSessionActive}
                onClick={() => setActiveTab('outgoing')}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
                  activeTab === 'outgoing'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Send className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Outgoing</span>
                <span className={cn(
                  'ml-1.5 px-2 py-0.5 rounded-full text-xs',
                  activeTab === 'outgoing' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>{filteredOutgoing.length}</span>
              </button>

              <div className="ml-auto">
                <RefreshControl onRefresh={() => { fetchIncoming(); fetchEndorsementBoxes() }} refreshing={loadingIncoming || loadingEndorsement} lastUpdated={lastUpdated} storageKey="qa" className="hidden sm:flex" />
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TAB: INCOMING BOXES (from Cut)                                   */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'incoming' && (
              <div className="flex-1 flex flex-col">
                {loadingIncoming ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm font-medium">Loading boxes...</p>
                  </div>
                ) : filteredIncoming.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                    <Inbox className="h-10 w-10 mb-3 text-primary" />
                    <p className="font-semibold text-foreground">No incoming boxes</p>
                    <p className="text-sm">Boxes advanced from the Cut stage will appear here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col min-h-0 flex-1">
                    <div className="flex-1 overflow-y-auto pr-1">
                      <div className="flex flex-col gap-2 pb-2">
                        {filteredIncoming.map(box => {
                          const isExpanded = expandedBoxId === box.id
                          const rowBooks = boxBooks[box.id] || []
                          const isLoadingBooks = loadingBoxBooks === box.id
                          const bookCount = box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
                          return (
                            <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
                                {/* Top row: chevron + icon + info + date */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <button onClick={() => toggleBox(box.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                                    <Package className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleBox(box.id)}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Sent from Cut</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                                  </div>
                                  {box.box_sessions?.[0]?.cut_time_send && (
                                    <div className="shrink-0 hidden sm:block text-right mr-2">
                                      <p className="text-xs text-muted-foreground">{new Date(box.box_sessions[0].cut_time_send).toLocaleDateString()}</p>
                                      <p className="text-[10px] text-muted-foreground/80">{new Date(box.box_sessions[0].cut_time_send).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                                    </div>
                                  )}
                                </div>
                                {/* Receive Box button: full-width on mobile */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); openConfirm('receive', box) }}
                                  disabled={receivingBox === box.id}
                                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                                >
                                  {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
                                  {receivingBox === box.id ? 'Receiving…' : 'Receive Box'}
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
                                    <div className="flex flex-col gap-1 border-l-2 border-primary/30 pl-3">
                                      {rowBooks.map(book => (
                                        <div key={book.id} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                                          <div className="flex flex-col">
                                            <span className="text-xs font-medium text-foreground">{book.isbn}</span>
                                            {book.title && <span className="text-[10px] text-muted-foreground break-words">{book.title}</span>}
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
                    </div>
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
                        <label className="text-sm font-medium text-foreground mb-4 block">Scanned Books Summary</label>
                        {inspScannedBooks.length === 0 ? (
                          <div className="border border-border rounded-lg bg-card p-4 text-center text-xs text-muted-foreground">No books scanned.</div>
                        ) : (
                          <div className="flex flex-col gap-6">
                            {/* Processable Books */}
                            {inspScannedBooks.filter(b => b.scan_status === 'processable').length > 0 && (
                              <div>
                                <label className="text-[11px] font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Processable Books</label>
                                <div className="max-h-60 overflow-y-auto border border-border rounded-lg bg-card divide-y divide-border">
                                  {inspScannedBooks.filter(b => b.scan_status === 'processable').map((book, idx) => (
                                    <div key={`proc-${book.id}-${idx}`} className="flex items-center gap-3 px-3 py-2 bg-muted/30">
                                      <span className="text-xs font-semibold w-24 shrink-0">{book.isbn}</span>
                                      <span className="text-[11px] break-words flex-1">{book.title}</span>
                                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-green-100 text-green-700">
                                        Processable
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Flagged Books */}
                            {inspScannedBooks.filter(b => b.scan_status === 'non_processable').length > 0 && (
                              <div>
                                <label className="text-[11px] font-bold text-red-600 mb-1 block uppercase tracking-wider">Newly Flagged Books</label>
                                <p className="text-[10px] text-muted-foreground mb-2">These books here are the ones you newly flagged.</p>
                                <div className="max-h-60 overflow-y-auto border border-red-200 rounded-lg bg-red-50/50 divide-y divide-red-100">
                                  {inspScannedBooks.filter(b => b.scan_status === 'non_processable').map((book, idx) => (
                                    <div key={`flag-${book.id}-${idx}`} className="flex items-center gap-3 px-3 py-2">
                                      <span className="text-xs font-semibold w-24 shrink-0 text-red-900">{book.isbn}</span>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-[11px] break-words text-red-900 font-medium">{book.title}</span>
                                        {(book.flag_issue || book.flag_remarks) && (
                                          <span className="text-[10px] text-red-700 mt-0.5 truncate">
                                            {book.flag_issue} {book.flag_remarks ? `— ${book.flag_remarks}` : ''}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-red-100 text-red-700 shrink-0">
                                        Flagged
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-4">
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
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setInspFlagModalBook(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-3">
                          <div className="p-2 bg-destructive/10 rounded-full h-fit">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Flag as Non-Processable
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium text-foreground">{inspFlagModalBook.isbn}</span> — {inspFlagModalBook.title}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setInspFlagModalBook(null)} className="text-muted-foreground hover:bg-muted p-1.5 rounded-md transition-colors"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Issue <span className="text-destructive">*</span></label>
                          <select value={inspFlagIssue} onChange={e => setInspFlagIssue(e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">Select issue…</option>
                            {FLAG_ISSUES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Remarks / Page No. <span className="text-destructive">*</span></label>
                          <textarea value={inspFlagRemarks} onChange={e => setInspFlagRemarks(e.target.value)}
                            placeholder="e.g. Page 42, bottom margin"
                            className="w-full min-h-[80px] resize-y rounded-md border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end mt-6">
                        <button onClick={() => setInspFlagModalBook(null)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted font-medium transition-colors">Cancel</button>
                        <button onClick={saveInspFlagFromLog} disabled={!inspFlagIssue || !inspFlagRemarks.trim() || inspFlagSaving}
                          className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium disabled:opacity-50 transition-colors">
                          {inspFlagSaving ? 'Saving…' : 'Confirm Flag'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!inspSessionActive ? (
                  /* ── Box list ── */
                  <div className="flex-1 flex flex-col">
                    {loadingEndorsement ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-sm font-medium">Loading boxes...</p>
                      </div>
                    ) : filteredInspection.length === 0 ? (
                      <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                        <ClipboardCheck className="h-10 w-10 mb-3 text-primary" />
                        <p className="font-semibold text-foreground">No boxes to inspect</p>
                        <p className="text-sm">Receive boxes from the Incoming Boxes tab first.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col min-h-0 flex-1">
                        <div className="flex-1 overflow-y-auto pr-1">
                          <div className="flex flex-col gap-2 pb-2">
                            {filteredInspection.map(box => {
                              const isExpanded = inspExpandedBoxId === box.id
                              const rowBooks = inspRowBooks[box.id] || []
                              const isLoadingBooks = loadingInspRowBooks === box.id
                              return (
                                <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
                                    {/* Top row: chevron + icon + info + date */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <button onClick={() => toggleInspRow(box.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </button>
                                      <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                                        <Package className="h-5 w-5 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleInspRow(box.id)}>
                                        <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                        <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                                      </div>
                                      {box.box_sessions?.[0]?.endorsement_time_received && (
                                        <div className="shrink-0 hidden sm:block text-right mr-2">
                                          <p className="text-xs text-muted-foreground">{new Date(box.box_sessions[0].endorsement_time_received).toLocaleDateString()}</p>
                                          <p className="text-[10px] text-muted-foreground/80">{new Date(box.box_sessions[0].endorsement_time_received).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                                        </div>
                                      )}
                                    </div>
                                    {/* Start Session button: desktop only */}
                                    {!isMobile && (
                                      <button
                                        onClick={() => openConfirm('start_session', box)}
                                        disabled={loadingInspSession}
                                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                                      >
                                        {loadingInspSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                                        {loadingInspSession ? 'Starting…' : 'Start Session'}
                                      </button>
                                    )}
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
                                              <span className="flex-1 text-muted-foreground break-words">{book.title || '—'}</span>
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
                        </div>
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
                      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                          <ScanBarcode className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Scanned</p>
                          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_scanned_books || 0}</p>
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
                          <CircleCheck className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Processable</p>
                          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_processable || 0}</p>
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
                          <CircleX className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Non-Processable</p>
                          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_non_processable || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Scanner ── */}
                    <ScannerInput onScan={handleInspScan} />

                    {/* ── Side-by-Side Warehouse and Endorsement Tables ── */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Warehouse Table (Left) - Read Only */}
                      <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold text-muted-foreground">Previous Scans (Inventory)</h3>
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
                                      <p className="text-[11px] text-foreground break-words">{book.title}</p>
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
                      <div className="bg-card border-2 border-primary rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold text-primary">Endorsement Scans</h3>
                            <span className="text-xs text-muted-foreground">({inspScannedBooks.length} books)</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
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
                              {inspScannedBooks
                                .map((book) => {
                                  const warehouseBook = warehouseBooks.find(wb => wb.isbn === book.isbn)
                                  const isMatch = warehouseBook && warehouseBook.scan_status === book.scan_status
                                  return { book, isMatch }
                                })
                                .sort((a, b) => b.book.timestamp.getTime() - a.book.timestamp.getTime())
                                .map(({ book, isMatch }, idx) => (
                                <div key={`${book.id}-${idx}`} className={cn("grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center",
                                  isMatch ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' : 'bg-red-100 border-red-300'
                                )}>
                                  <div className="col-span-3">
                                    <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                                  </div>
                                  <div className="col-span-5">
                                    <p className="text-[11px] text-muted-foreground break-words">{book.title}</p>
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
              <div className="flex-1 flex flex-col">
                {filteredOutgoing.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                    <Send className="h-10 w-10 mb-3 text-primary" />
                    <p className="font-semibold text-foreground">No outgoing boxes yet</p>
                    <p className="text-sm">Complete an inspection session in the Book Inspection tab to add boxes here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col min-h-0 flex-1">
                    <div className="flex-1 overflow-y-auto pr-1">
                      <div className="flex flex-col gap-2 pb-2">
                        {filteredOutgoing.map(box => {
                          const isExpanded = expandedBoxId === box.id
                          const rowBooks = boxBooks[box.id] || []
                          const isLoadingBooks = loadingBoxBooks === box.id
                          const bookCount = box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
                          return (
                            <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
                                {/* Top row: chevron + icon + info + date */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <button onClick={() => toggleBox(box.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                                    <Package className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleBox(box.id)}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Endorsed</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                                  </div>
                                  {(box.latest_endorsement_scan_at || box.box_sessions?.[0]?.updated_at) && (
                                    <div className="shrink-0 hidden sm:flex flex-col items-end gap-0.5 mr-2">
                                      <span className="text-xs text-muted-foreground">{new Date(box.latest_endorsement_scan_at || box.box_sessions?.[0]?.updated_at as string).toLocaleDateString()}</span>
                                      <span className="text-[10px] text-muted-foreground/80">{new Date(box.latest_endorsement_scan_at || box.box_sessions?.[0]?.updated_at as string).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                    </div>
                                  )}
                                </div>
                                {/* Send button: full-width on mobile, always visible */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); openConfirm('send_to_scan', box) }}
                                  disabled={sendingToScan === box.id}
                                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
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
                                    <div className="flex flex-col gap-1 border-l-2 border-primary/30 pl-3">
                                      {rowBooks.map(book => (
                                        <div key={book.id} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                                          <div className="flex flex-col">
                                            <span className="text-xs font-medium text-foreground">{book.isbn}</span>
                                            {book.title && <span className="text-[10px] text-muted-foreground break-words">{book.title}</span>}
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
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>

    {/* ── Confirmation Modal ─────────────────────────────────────────────────── */}
    <ConfirmActionModal
      open={confirmModal.open}
      title={
        confirmModal.action === 'receive' ? 'Confirm Receipt' :
        confirmModal.action === 'start_session' ? 'Start Inspection Session' :
        'Send to Scan'
      }
      description={
        confirmModal.action === 'receive' ? (
          <><strong>{inspUserName || 'You'}</strong> will receive <strong>{confirmModal.box?.box_number}</strong> from <strong>Cut</strong>.</>
        ) : confirmModal.action === 'start_session' ? (
          <>Begin an inspection session on <strong>{confirmModal.box?.box_number}</strong>. Make sure the box is physically with you.</>
        ) : (
          <>Send <strong>{confirmModal.box?.box_number}</strong> to <strong>Scan</strong>? This cannot be undone.</>
        )
      }
      hint={
        confirmModal.action === 'receive' ? 'Make sure you have physically received the box.' :
        confirmModal.action === 'send_to_scan' ? 'Ensure all books have been inspected and endorsed before sending.' :
        undefined
      }
      flow={
        confirmModal.action === 'receive'
          ? { from: 'Cut', to: 'Book Endorsement', fromColor: 'bg-orange-100 text-orange-700 border-orange-300', toColor: 'bg-purple-100 text-purple-700 border-purple-300' }
          : confirmModal.action === 'send_to_scan'
          ? { from: 'Book Endorsement', to: 'Scan', fromColor: 'bg-purple-100 text-purple-700 border-purple-300', toColor: 'bg-green-100 text-green-700 border-green-300' }
          : undefined
      }
      confirmLabel={
        confirmModal.action === 'receive' ? 'Yes, Receive' :
        confirmModal.action === 'start_session' ? 'Start Session' :
        'Yes, Send to Scan'
      }
      variant={confirmModal.action === 'send_to_scan' ? 'destructive' : 'default'}
      loading={
        (confirmModal.action === 'receive' && !!receivingBox) ||
        (confirmModal.action === 'start_session' && loadingInspSession) ||
        (confirmModal.action === 'send_to_scan' && !!sendingToScan)
      }
      onCancel={closeConfirm}
      onConfirm={() => {
        if (!confirmModal.box) return
        const box = confirmModal.box
        closeConfirm()
        if (confirmModal.action === 'receive') handleReceiveBox(box)
        else if (confirmModal.action === 'start_session') handleStartInspSession(box.id)
        else handleSendToScan(box)
      }}
    />
    </>
  )
}
