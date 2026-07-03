'use client'

import { useState, useEffect, useRef } from 'react'
import { authFetch, fetchUserProfile } from '@/lib/auth-api'
import { useBrand } from '@/hooks/use-brand'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/pagination'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScannerInput } from '@/components/scanner-input'
import { useToast } from '@/hooks/use-toast'
import { Barcode, Package, Search, ChevronDown, ChevronRight, BookOpen, Printer, Zap, CheckCircle2, XCircle, Loader2, AlertTriangle, Trash2, Inbox, ClipboardCheck, ArrowRight, Send, ClipboardList, RefreshCw } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bwipjs = require('bwip-js')



interface BookInBox {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  scanned_at: string
  book_type?: string
}

interface Box {
  id: string
  box_number: string
  lot_id: string
  total_books_expected: number
  books_transmitted: number
  current_stage: string
  created_at: string
  lot: { lot_number: string; status: string }
  books: BookInBox[] | { count: number }[]
  scans: { count: number }[]
  box_sessions?: { id?: string; status: string; warehouse_user_received?: string; inventory_user_received?: string; endorsement_user_received?: string; inventory_user_scan?: string; started_at?: string }[]
}

interface VerifScannedBook {
  id: string
  isbn: string
  title: string
  author: string
  scan_status: 'processable' | 'non_processable'
  flag_issue?: string
  flag_remarks?: string
  timestamp: Date
}

interface VerifSession {
  id: string
  status: string
  total_scanned: number
  total_processable: number
  total_non_processable: number
  box_id?: string | null
}

interface WarehouseBook {
  id?: string
  isbn: string
  title: string
  scan_status: 'processable' | 'non_processable'
  rejection_reason?: string
  scanned_at: string
  scanned_by_name: string
}



const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const STAGE_COLORS: Record<string, string> = {
  warehouse:  'bg-gray-100 text-gray-700',
  inventory:  'bg-gray-100 text-gray-700',
  cut:        'bg-orange-100 text-orange-700',
  qc:         'bg-yellow-100 text-yellow-700',
  scan:       'bg-blue-100 text-blue-700',
  qa:         'bg-purple-100 text-purple-700',
  transmit:   'bg-green-100 text-green-700',
  storage:    'bg-emerald-100 text-emerald-700',
}

const LOT_OPTIONS = Array.from({ length: 100 }, (_, i) => `Lot ${i + 1}`)
const LOT_ALIASES = Array.from({ length: 100 }, (_, i) => [`Lot ${i + 1}`, `Lot-${i + 1}`, `LOT ${i + 1}`, `LOT-${i + 1}`])

const FLAG_ISSUES = [
  { value: "bleed-through",        label: "Bleed-through on page" },
  { value: "brittle",              label: "Brittle on page" },
  { value: "cannot-detach-sticky", label: "Cannot be detached or sticky pages" },
  { value: "cd-only",              label: "CD only, no text content" },
  { value: "map-spanning",         label: "Contains a map spanning the entire book" },
  { value: "split-pages",          label: "Contains split pages" },
  { value: "cutoff-text",          label: "Cutoff text on page" },
  { value: "illegible-text",       label: "Illegible text" },
  { value: "inverted-contrast",    label: "Inverted contrast: White on black background" },
  { value: "missing-pages",        label: "Missing page/s" },
  { value: "no-content",           label: "No content or body text" },
  { value: "obscured-highlight",   label: "Obscured text due to highlight marker" },
  { value: "obscured-watermark",   label: "Obscured text due to watermarks" },
  { value: "oversized",            label: "Oversized and cannot fit in the scanner" },
  { value: "pen-marks",            label: "Pen marks on page" },
  { value: "pop-up-book",          label: "Pop-up book" },
  { value: "postcard-only",        label: "Postcard only" },
  { value: "stained-dirty",        label: "Stained or dirty page" },
  { value: "stamp-mark",           label: "Stamp mark on page" },
  { value: "thick-cardboard",      label: "Thick or cardboard pages" },
  { value: "torn-pages",           label: "Torn pages" },
]

export default function InventoryPage() {
  const { brand } = useBrand()
  const { toast } = useToast()
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<Date | null>(null)

  // --- Boxes tab state ---
  const [boxes, setBoxes] = useState<Box[]>([])
  const [boxSearch, setBoxSearch] = useState('')
  const [lotFilter, setLotFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [expandedBox, setExpandedBox] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingBoxes, setLoadingBoxes] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState<string | null>(null)
  const [boxScanInput, setBoxScanInput] = useState('')
  const [boxScanResult, setBoxScanResult] = useState<Box | null>(null)
  const [boxScanNotFound, setBoxScanNotFound] = useState(false)
  const [scannedBoxModal, setScannedBoxModal] = useState<{ box: Box; books: BookInBox[] } | null>(null)
  const [loadingScannedBox, setLoadingScannedBox] = useState(false)
  const [printBox, setPrintBox] = useState<Box | null>(null)
  const [printBooks, setPrintBooks] = useState<BookInBox[]>([])
  const [printBookType, setPrintBookType] = useState<string>('')
  const [loadingPrint, setLoadingPrint] = useState<string | null>(null)
  const qrRef = useRef<HTMLCanvasElement>(null)
  const printProcessRows = [
    'Inventory & Registration',
    'Cutting',
    'Book Endorsement',
    'Scanning',
    'Book Storage',
  ]

  // --- Per-box Simflex ISBN status ---
  const [simflexBookStatus, setSimflexBookStatus] = useState<Record<string, Record<string, string>>>({})
  const [loadingSimflexStatus, setLoadingSimflexStatus] = useState<string | null>(null)

  const fetchSimflexBookStatus = async (box: Box, bookList: BookInBox[]) => {
    const processable = bookList.filter(b => b.scan_status === 'processable')
    if (processable.length === 0) return
    setLoadingSimflexStatus(box.id)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const isbns = processable.map(b => b.isbn).join(',')
      const res = await authFetch(`${API_URL}/api/scanning/simflex-status?isbns=${isbns}&location=${brand}`)
      const data = await res.json()
      if (data.success && data.statuses) {
        setSimflexBookStatus(prev => ({ ...prev, [box.id]: data.statuses }))
      }
    } catch (e) {
      console.error('Failed to fetch simflex status:', e)
    } finally {
      setLoadingSimflexStatus(null)
    }
  }

  // --- Delete box state ---
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; box_number: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteBox = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await authFetch(`${API_URL}/api/boxes/${deleteConfirm.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setBoxes(prev => prev.filter(b => b.id !== deleteConfirm.id))
      setDeleteConfirm(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // --- Simflex check state ---
  const [simflexModal, setSimflexModal] = useState<null | {
    box: Box
    loading: boolean
    result: {
      autoAdvanced: boolean
      allCompleted: boolean
      finalStage: string
      totalProcessable: number
      completedCount: number
      pendingCount: number
      message: string
      simflexResults: { isbn: string; transmissionCompleted: boolean; latestStatus: string | null; boxNumber: string | null }[]
      notCompleted: { isbn: string; latestStatus: string | null }[]
    } | null
    error: string | null
  }>(null)




  useEffect(() => { fetchBoxes() }, [lotFilter, stageFilter])

  useEffect(() => {
    const loadUserProfile = async () => {
      const profile = await fetchUserProfile() as any
      if (profile) {
        if (profile.name) setVerifUserName(profile.name)
        if (profile.id) setVerifUserId(profile.id)
      }
    }
    loadUserProfile()
  }, [])


  const fetchBoxes = async () => {
    setLoadingBoxes(true)
    try {
      let url = `${API_URL}/api/boxes`
      const params: string[] = []
      if (stageFilter) params.push(`current_stage=${stageFilter}`)
      if (params.length) url += '?' + params.join('&')

      const res = await authFetch(url)
      const data = await res.json()
      let result: Box[] = data.boxes || []

      if (lotFilter) {
        const idx = LOT_OPTIONS.indexOf(lotFilter)
        const aliases = idx >= 0 ? LOT_ALIASES[idx].map(a => a.toLowerCase()) : [lotFilter.toLowerCase()]
        result = result.filter(b => aliases.includes((b.lot?.lot_number || '').toLowerCase()))
      }
      setBoxes(result)
      setLastInventoryUpdate(new Date())
    } catch (e) {
      console.error('Failed to fetch boxes:', e)
    } finally {
      setLoadingBoxes(false)
    }
  }

  const fetchBooksInBox = async (boxId: string) => {
    if (boxBooks[boxId]) return
    setLoadingBooks(boxId)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${boxId}`)
      const data = await res.json()
      if (data.box?.books) {
        setBoxBooks(prev => ({ ...prev, [boxId]: data.box.books }))
      }
    } catch (e) {
      console.error('Failed to fetch books in box:', e)
    } finally {
      setLoadingBooks(null)
    }
  }

  const handlePrintLabel = async (box: Box) => {
    setLoadingPrint(box.id)
    try {
      let books: BookInBox[] = boxBooks[box.id]
      if (!books) {
        const res = await authFetch(`${API_URL}/api/boxes/${box.id}`)
        const data = await res.json()
        books = data.box?.books || []
        setBoxBooks(prev => ({ ...prev, [box.id]: books }))
      }

      const bookTypeResponse = await authFetch(`${API_URL}/api/books?box_id=${box.id}`)
      const bookTypeData = await bookTypeResponse.json()
      const derivedType = (Array.from(new Set((bookTypeData.books || [])
        .map((book: { book_type?: string }) => (book.book_type || '').trim())
        .filter(Boolean))) as string[])
        .map(type => type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())[0] || '—'

      setPrintBox(box)
      setPrintBooks(books)
      setPrintBookType(derivedType)
    } catch (e) {
      console.error('Failed to fetch books for label:', e)
    } finally {
      setLoadingPrint(null)
    }
  }

  const handleBoxScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const query = boxScanInput.trim()
    if (!query) return

    setBoxScanNotFound(false)
    setBoxScanResult(null)
    setScannedBoxModal(null)

    // Find box by box_number (exact or partial match)
    const match = boxes.find(b => b.box_number?.toLowerCase() === query.toLowerCase())
      || boxes.find(b => b.box_number?.toLowerCase().includes(query.toLowerCase()))

    if (match) {
      setBoxScanResult(match)
      setExpandedBox(match.id)
      setBoxSearch(match.box_number)
      // Fetch books and show modal
      setLoadingScannedBox(true)
      try {
        const res = await authFetch(`${API_URL}/api/boxes/${match.id}`)
        const data = await res.json()
        const books = data.box?.books || []
        setBoxBooks(prev => ({ ...prev, [match.id]: books }))
        setScannedBoxModal({ box: match, books })
      } catch {
        setScannedBoxModal({ box: match, books: [] })
      } finally {
        setLoadingScannedBox(false)
      }
    } else {
      setBoxScanNotFound(true)
    }
    setBoxScanInput('')
  }

  const toggleBox = (boxId: string) => {
    if (expandedBox === boxId) {
      setExpandedBox(null)
    } else {
      setExpandedBox(boxId)
      fetchBooksInBox(boxId)
    }
  }

  const [movingToStorage, setMovingToStorage] = useState<string | null>(null)

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [inventoryTab, setInventoryTab] = useState<'incoming' | 'verification' | 'outgoing'>('incoming')

  // ── Verified box IDs (session-complete → outgoing) ─────────────────────────
  // Boxes move here after a verification session is completed (still inventory stage in DB).
  // ── Book Verification list: expandable row state ───────────────────────────
  const [verifExpandedBoxId, setVerifExpandedBoxId] = useState<string | null>(null)
  const [verifRowBooks, setVerifRowBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingVerifRowBooks, setLoadingVerifRowBooks] = useState<string | null>(null)

  const toggleVerifRow = async (boxId: string) => {
    if (verifExpandedBoxId === boxId) { setVerifExpandedBoxId(null); return }
    setVerifExpandedBoxId(boxId)
    if (!verifRowBooks[boxId]) {
      setLoadingVerifRowBooks(boxId)
      try {
        const res = await authFetch(`${API_URL}/api/boxes/${boxId}`)
        const data = await res.json()
        setVerifRowBooks(prev => ({ ...prev, [boxId]: data.box?.books || [] }))
      } catch {
        setVerifRowBooks(prev => ({ ...prev, [boxId]: [] }))
      } finally {
        setLoadingVerifRowBooks(null)
      }
    }
  }

  // ── Incoming: Receive box (warehouse → inventory) ──────────────────────────
  const [receivingBox, setReceivingBox] = useState<string | null>(null)

  const handleReceiveBox = async (box: Box) => {
    setReceivingBox(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Received at Inventory' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to receive box')
      fetchBoxes()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceivingBox(null)
    }
  }

  // ── Book Verification: session state ───────────────────────────────────────
  const [verifSessionActive, setVerifSessionActive] = useState(false)
  const [verifSelectedBoxId, setVerifSelectedBoxId] = useState('')
  const [verifUserName, setVerifUserName] = useState('')
  const [verifUserId, setVerifUserId] = useState('')
  const [verifBox, setVerifBox] = useState<Box | null>(null)
  const [verifBooks, setVerifBooks] = useState<BookInBox[]>([])
  const [loadingVerifBooks, setLoadingVerifBooks] = useState(false)
  const [verifConfirmComplete, setVerifConfirmComplete] = useState(false)
  // Warehouse-style verification session state
  const [verifCurrentSession, setVerifCurrentSession] = useState<VerifSession | null>(null)
  const [verifScannedBooks, setVerifScannedBooks] = useState<VerifScannedBook[]>([])
  const [verifBookCounter, setVerifBookCounter] = useState(0)
  const [verifCurrentBoxBooks, setVerifCurrentBoxBooks] = useState(0)
  const [verifTotalBooksExpected, setVerifTotalBooksExpected] = useState('')
  const [verifIssueIsbn, setVerifIssueIsbn] = useState('')
  const [verifIssueType, setVerifIssueType] = useState<'missing' | 'extra'>('missing')
  const [verifIssues, setVerifIssues] = useState<Array<{ isbn: string; type: 'missing' | 'extra'; title?: string; author?: string }>>([])
  const [verifFetchingIssueBook, setVerifFetchingIssueBook] = useState(false)
  const [verifFlagModalBook, setVerifFlagModalBook] = useState<VerifScannedBook | null>(null)
  const [verifFlagIssue, setVerifFlagIssue] = useState('')
  const [verifFlagRemarks, setVerifFlagRemarks] = useState('')
  const [verifFlagSaving, setVerifFlagSaving] = useState(false)

  // ── Warehouse Data for Side-by-Side View ─────────────────────────────────────
  const [warehouseBooks, setWarehouseBooks] = useState<WarehouseBook[]>([])
  const [loadingWarehouseBooks, setLoadingWarehouseBooks] = useState(false)

  const issueLabel = (val: string) => FLAG_ISSUES.find(i => i.value === val)?.label || val
  const lastInventoryUpdateLabel = lastInventoryUpdate
    ? `Updated ${lastInventoryUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
    : 'Not updated yet'

  // ── Fetch Warehouse Books for Comparison ───────────────────────────────────
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

  const handleStartVerifSession = async (overrideBoxId?: string) => {
    const boxId = overrideBoxId ?? verifSelectedBoxId
    if (!boxId) return
    const box = inventoryBoxes.find(b => b.id === boxId)
    if (!box) return
    setLoadingVerifBooks(true)
    try {
      // Resume the existing session for the inventory box
      const res = await authFetch(`${API_URL}/api/warehouse/boxes/${box.id}/resume-session`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start verification session')

      const boxRes = await authFetch(`${API_URL}/api/boxes/${box.id}`)
      const boxData = await boxRes.json()

      setVerifCurrentSession({ ...data.session, total_scanned: 0, total_processable: 0, total_non_processable: 0 })
      setVerifBox(box)
      setVerifBooks(boxData.box?.books || [])
      setVerifScannedBooks([])
      setVerifBookCounter(0)
      setVerifCurrentBoxBooks(0)
      setVerifTotalBooksExpected('')
      setVerifIssueIsbn('')
      setVerifIssues([])
      setVerifSessionActive(true)
      // Fetch warehouse books for side-by-side comparison
      fetchWarehouseBooks(box.id)
      toast({ title: 'Verification Session Started', description: `Session started for ${box.box_number}.` })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to start verification session', variant: 'destructive' })
    } finally {
      setLoadingVerifBooks(false)
    }
  }

  const handleVerifScan = async (isbn: string) => {
    if (!verifCurrentSession) return
    setLoadingVerifBooks(true)
    // Look up warehouse status for this ISBN so the inventory scan inherits it
    const warehouseStatus = warehouseBooks.find(wb => wb.isbn === isbn)?.scan_status ?? 'processable'
    try {
      const res = await authFetch(`${API_URL}/api/books/ilms/search/${isbn}`)
      const data = await res.json()
      if (data.success && data.data && !data.data.Message) {
        saveVerifBookToLocal({ isbn: data.data.ISBN || isbn, title: data.data.Title || `ISBN: ${isbn}`, author: data.data.Author || `Author ${verifBookCounter + 1}` }, warehouseStatus, null, null)
      } else {
        saveVerifBookToLocal({ isbn, title: `Book ${verifBookCounter + 1}`, author: `Author ${verifBookCounter + 1}` }, warehouseStatus, null, null)
        toast({ title: 'Book Not Found', description: 'ISBN not found in iLMS. Added to verification log anyway.', variant: 'destructive' })
      }
    } catch {
      saveVerifBookToLocal({ isbn, title: `Book ${verifBookCounter + 1}`, author: `Author ${verifBookCounter + 1}` }, warehouseStatus, null, null)
      toast({ title: 'API Error', description: 'Failed to fetch book details. Added to verification log anyway.', variant: 'destructive' })
    } finally {
      setLoadingVerifBooks(false)
    }
  }

  const saveVerifBookToLocal = (bookData: any, scan_status: 'processable' | 'non_processable', flag_issue: string | null, flag_remarks: string | null) => {
    if (!verifCurrentSession || !bookData) return
    setVerifCurrentBoxBooks(prev => prev + 1)
    setVerifBookCounter(prev => prev + 1)
    const newBook: VerifScannedBook = {
      id: `local-${Date.now()}`,
      isbn: bookData.isbn,
      title: bookData.title,
      author: bookData.author,
      scan_status,
      flag_issue: flag_issue || undefined,
      flag_remarks: flag_remarks || undefined,
      timestamp: new Date()
    }
    setVerifScannedBooks(prev => [newBook, ...prev])
    setVerifCurrentSession(prev => prev ? {
      ...prev,
      total_scanned: prev.total_scanned + 1,
      total_processable: scan_status === 'processable' ? prev.total_processable + 1 : prev.total_processable,
      total_non_processable: scan_status === 'non_processable' ? prev.total_non_processable + 1 : prev.total_non_processable,
    } : null)
  }

  const saveVerifBookToDB = async (bookData: any, scan_status: 'processable' | 'non_processable', flag_issue: string | null, flag_remarks: string | null) => {
    if (!verifCurrentSession || !bookData) return
    try {
      const res = await authFetch(`${API_URL}/api/warehouse/sessions/${verifCurrentSession.id}/scan`, {
        method: 'POST',
        body: JSON.stringify({
          isbn: bookData.isbn,
          title: bookData.title,
          author: bookData.author,
          scan_status,
          rejection_reason: flag_issue || null,
          notes: flag_remarks || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process book')
      return data.scanLog.id
    } catch (error) {
      console.error('Error saving verification book to DB:', error)
      throw error
    }
  }

  const handleRemoveVerifBook = (bookId: string) => {
    const book = verifScannedBooks.find(b => b.id === bookId)
    if (!book) return
    setVerifScannedBooks(prev => prev.filter(b => b.id !== bookId))
    setVerifCurrentBoxBooks(prev => Math.max(0, prev - 1))
    setVerifBookCounter(prev => Math.max(0, prev - 1))
    setVerifCurrentSession(prev => prev ? {
      ...prev,
      total_scanned: Math.max(0, prev.total_scanned - 1),
      total_processable: book.scan_status === 'processable' ? Math.max(0, prev.total_processable - 1) : prev.total_processable,
      total_non_processable: book.scan_status === 'non_processable' ? Math.max(0, prev.total_non_processable - 1) : prev.total_non_processable,
    } : null)
    toast({ title: 'Book Removed', description: `${book.isbn} removed from verification log.` })
  }

  const openVerifFlagModal = (book: VerifScannedBook) => {
    setVerifFlagModalBook(book)
    setVerifFlagIssue(book.flag_issue || '')
    setVerifFlagRemarks(book.flag_remarks || '')
  }

  const saveVerifFlagFromLog = async () => {
    if (!verifFlagModalBook || !verifFlagIssue) { toast({ title: 'Select an issue first', variant: 'destructive' }); return }
    setVerifFlagSaving(true)
    const isEditing = verifFlagModalBook.scan_status === 'non_processable'
    try {
      setVerifScannedBooks(prev => prev.map(b => b.id === verifFlagModalBook.id
        ? { ...b, scan_status: 'non_processable', flag_issue: verifFlagIssue, flag_remarks: verifFlagRemarks }
        : b
      ))
      // Only adjust counts when flagging for the first time, not when editing an existing flag
      if (!isEditing) {
        setVerifCurrentSession(prev => prev ? {
          ...prev,
          total_non_processable: prev.total_non_processable + 1,
          total_processable: Math.max(0, prev.total_processable - 1),
        } : null)
      }
      setVerifFlagModalBook(null)
      toast({ title: isEditing ? 'Flag Updated' : 'Flagged as Non-Processable' })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setVerifFlagSaving(false) }
  }

  const handleVerifAddIssue = async () => {
    if (!verifIssueIsbn.trim()) return

    if (verifScannedBooks.some(b => b.isbn === verifIssueIsbn.trim())) {
      toast.error('This book was already scanned successfully in this session.')
      setVerifIssueIsbn('')
      return
    }
    
    if (verifIssues.some(i => i.isbn === verifIssueIsbn.trim())) {
      toast.error('This issue has already been added.')
      setVerifIssueIsbn('')
      return
    }

    setVerifFetchingIssueBook(true)
    try {
      const res = await authFetch(`${API_URL}/api/books/ilms/search/${verifIssueIsbn}`)
      const data = await res.json()
      const issueData = {
        isbn: verifIssueIsbn,
        type: verifIssueType,
        title: data.success && data.data && !data.data.Message ? data.data.Title : `Book ${verifBookCounter + 1}`,
        author: data.success && data.data && !data.data.Message ? data.data.Author : `Author ${verifBookCounter + 1}`
      }
      setVerifIssues(prev => [...prev, issueData])
      setVerifIssueIsbn('')
    } catch {
      const issueData = {
        isbn: verifIssueIsbn,
        type: verifIssueType,
        title: `Book ${verifBookCounter + 1}`,
        author: `Author ${verifBookCounter + 1}`
      }
      setVerifIssues(prev => [...prev, issueData])
      setVerifIssueIsbn('')
    } finally {
      setVerifFetchingIssueBook(false)
    }
  }

  const handleVerifRemoveIssue = (isbn: string) => {
    setVerifIssues(prev => prev.filter(issue => issue.isbn !== isbn))
  }

  const handleVerifIssueKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && verifIssueIsbn.trim()) {
      handleVerifAddIssue()
    }
  }

  const handleResetVerifSession = async () => {
    if (!verifCurrentSession) return
    try {
      if (verifBox) {
        await authFetch(`${API_URL}/api/warehouse/boxes/${verifBox.id}/cancel-session`, {
          method: 'POST'
        })
      }
    } catch (e) {
      console.error('Failed to reset session status:', e)
    }
    setVerifSessionActive(false)
    setVerifBox(null)
    setVerifBooks([])
    setVerifSelectedBoxId('')
    setVerifCurrentSession(null)
    setVerifScannedBooks([])
    setVerifBookCounter(0)
    setVerifCurrentBoxBooks(0)
    setVerifTotalBooksExpected('')
    setVerifIssueIsbn('')
    setVerifIssues([])
    setVerifConfirmComplete(false)
    toast({ title: 'Verification Session Reset', description: 'Session has been reset. Scanned data was not saved.' })
  }

  const handleOpenVerifComplete = () => {
    if (!verifCurrentSession) return
    if (verifScannedBooks.length === 0) {
      toast({ title: 'Cannot Complete Session', description: 'Please scan at least one book before completing the session.', variant: 'destructive' })
      return
    }

    const isFullyMatched = warehouseBooks.length === verifScannedBooks.length &&
      warehouseBooks.every(wb => verifScannedBooks.some(vb => vb.isbn === wb.isbn));
      
    if (!isFullyMatched) {
      toast({ title: 'Discrepancy Detected', description: 'Your scans must perfectly match the Warehouse guide before you can complete the session.', variant: 'destructive' })
      return
    }
    setVerifTotalBooksExpected('')
    setVerifIssueIsbn('')
    setVerifIssueType('missing')
    setVerifIssues([])
    setVerifConfirmComplete(true)
  }

  const handleCompleteVerifSession = async () => {
    if (!verifCurrentSession || !verifBox) return
    setLoadingVerifBooks(true)
    try {
      // Save ONLY flagged books or completely new books to DB to prevent double counting processable books
      const booksToSave = verifScannedBooks.filter(b => 
        b.scan_status === 'non_processable' || 
        !warehouseBooks.some(wb => wb.isbn === b.isbn)
      );
      
      for (const book of booksToSave) {
        try {
          const warehouseBook = warehouseBooks.find(wb => wb.isbn === book.isbn);
          if (warehouseBook && warehouseBook.scan_status === 'processable' && book.scan_status === 'non_processable') {
            // Book was previously processable, now non_processable. Tag it using the scan ID
            if (warehouseBook.id) {
              const res = await authFetch(`${API_URL}/api/warehouse/scans/${warehouseBook.id}/tag`, {
                method: 'POST',
                body: JSON.stringify({
                  status: 'non_processable',
                  remarks: book.flag_issue + (book.flag_remarks ? ` - ${book.flag_remarks}` : '')
                })
              });
              if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to tag book');
              }
            } else {
              // Fallback if ID is missing (shouldn't happen with the updated backend)
              await saveVerifBookToDB(book, book.scan_status, book.flag_issue || null, book.flag_remarks || null);
            }
          } else if (!warehouseBook) {
            // Book wasn't scanned in warehouse at all, save as new scan
            await saveVerifBookToDB(book, book.scan_status, book.flag_issue || null, book.flag_remarks || null);
          }
        } catch (error) {
          toast({ title: 'Error', description: `Failed to save book ${book.isbn}. Session not completed.`, variant: 'destructive' })
          throw error
        }
      }

      // Then complete the warehouse session
      await authFetch(`${API_URL}/api/warehouse/sessions/${verifCurrentSession.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          stage: 'inventory',
          issues: verifIssues
        })
      })

      // Update local boxes state to reflect session completed status instantly
      setBoxes(prev => prev.map(b => b.id === verifBox.id ? { 
        ...b, 
        box_sessions: b.box_sessions?.map(s => s.id === verifCurrentSession.id ? { ...s, status: 'completed' } : s) || [{ status: 'completed' }]
      } : b))
      setVerifSessionActive(false)
      setVerifBox(null)
      setVerifBooks([])
      setVerifSelectedBoxId('')
      setVerifCurrentSession(null)
      setVerifScannedBooks([])
      setVerifBookCounter(0)
      setVerifCurrentBoxBooks(0)
      setVerifTotalBooksExpected('')
      setVerifIssueIsbn('')
      setVerifIssues([])
      setVerifConfirmComplete(false)
      // Switch to outgoing tab so they see the result immediately
      setInventoryTab('outgoing')
      toast({ title: 'Verification Session Closed', description: 'Verification completed successfully.' })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to complete verification session', variant: 'destructive' })
    } finally {
      setLoadingVerifBooks(false)
    }
  }

  // ── Outgoing: Send to Cut (inventory → cut) ────────────────────────────────
  const [sendingToCut, setSendingToCut] = useState<string | null>(null)

  const handleSendToCut = async (box: Box) => {
    setSendingToCut(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Sent to Cut from Inventory Outgoing' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send to cut')
      // Remove from verified set once sent
      setVerifiedBoxIds(prev => { const next = new Set(prev); next.delete(box.id); return next })
      fetchBoxes()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send to cut')
    } finally {
      setSendingToCut(null)
    }
  }

  const handleMoveToStorage = async (box: Box) => {
    setMovingToStorage(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to advance')
      fetchBoxes()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to move to storage')
    } finally {
      setMovingToStorage(null)
    }
  }

  const handleCheckSimflex = async (box: Box) => {
    setSimflexModal({ box, loading: true, result: null, error: null })
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/check-simflex`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSimflexModal(prev => prev ? { ...prev, loading: false, error: data.error || 'Request failed' } : null)
        return
      }
      setSimflexModal(prev => prev ? { ...prev, loading: false, result: data } : null)
      // If auto-advanced, refresh boxes list so the stage updates
      if (data.autoAdvanced) fetchBoxes()
    } catch (e) {
      setSimflexModal(prev => prev ? { ...prev, loading: false, error: e instanceof Error ? e.message : 'Unknown error' } : null)
    }
  }





  useEffect(() => {
    if (!printBox) return

    const render = () => {
      // Code128 barcode (readable by standard 1D barcode scanners)
      if (qrRef.current) {
        try {
          qrRef.current.width = 600
          qrRef.current.height = 120
          bwipjs.toCanvas(qrRef.current, {
            bcid: 'code128',
            text: printBox.box_number,
            scale: 3,
            height: 18,
            includetext: false,
            paddingwidth: 4,
            paddingheight: 2,
          })
        } catch (e) {
          console.error('Barcode error:', e)
        }
      }
    }

    const timer = setTimeout(render, 50)
    return () => clearTimeout(timer)
  }, [printBox])

  // Base search filter (used for All Boxes tab only)
  const searchFilter = (b: Box) => {
    if (!boxSearch) return true
    const q = boxSearch.toLowerCase()
    return (
      b.box_number?.toLowerCase().includes(q) ||
      b.lot?.lot_number?.toLowerCase().includes(q) ||
      b.current_stage?.toLowerCase().includes(q)
    )
  }

  // All-boxes tab (existing behaviour, respects lot/stage filters)
  const filteredBoxes = boxes.filter(searchFilter)

  // Incoming Boxes — warehouse stage
  const incomingBoxes = boxes.filter(b => 
    b.current_stage === 'warehouse' && 
    b.box_sessions?.some(s => s.status === 'completed')
  )

  // Book Verification — inventory stage, not yet verified
  const inventoryBoxes = boxes.filter(b => {
    if (b.current_stage !== 'inventory') return false
    if (b.box_sessions?.some(s => s.status === 'completed')) return false
    // Only hide in_progress boxes from others once we know who the current user is
    if (verifUserId) {
      const inProgressSession = b.box_sessions?.find(s => s.status === 'in_progress')
      if (inProgressSession && inProgressSession.inventory_user_scan !== verifUserId) return false
    }
    return true
  })

  // Outgoing Boxes — inventory stage + verified this session
  const outgoingBoxes = boxes.filter(b => b.current_stage === 'inventory' && b.box_sessions?.some(s => s.status === 'completed'))

  // Pagination only used by All Boxes tab
  const pagination = usePagination({ totalItems: filteredBoxes.length, defaultPageSize: 50 })
  const paginatedBoxes = filteredBoxes.slice(pagination.offset, pagination.offset + pagination.limit)

  return (
    <>
    {/* ── DELETE BOX CONFIRM DIALOG ── */}
    {deleteConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
        <div className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 rounded-full p-2"><Trash2 className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="font-semibold text-foreground">Delete Box</p>
              <p className="text-xs text-muted-foreground mt-0.5">This cannot be undone</p>
            </div>
          </div>
          <p className="text-sm text-foreground">
            Permanently delete <span className="font-semibold">{deleteConfirm.box_number}</span> and all its scan records, storage assignments, and pipeline events?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >Cancel</button>
            <button
              onClick={handleDeleteBox}
              disabled={deleting}
              className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-2"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── PRINT LABEL OVERLAY (print-only) A6 landscape yellow label ── */}
    {printBox && (
      <div className="hidden print:flex print:fixed print:inset-0 print:bg-white print:z-[9999] print:items-start print:justify-start">
        {/*
          A6 landscape = 148mm × 105mm.
          At 96dpi: 148mm ≈ 559px, 105mm ≈ 397px.
          We use mm units via inline style for accurate print sizing.
        */}
        <div
          style={{
            width: '148mm',
            height: '105mm',
            backgroundColor: '#FFC107',
            border: '2px solid #111',
            display: 'flex',
            flexDirection: 'row',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#111',
            overflow: 'hidden',
            boxSizing: 'border-box',
            padding: '3mm',
            gap: '3mm',
          }}
        >
          {/* ── LEFT: Process table + Remarks ── */}
          <div style={{ flex: '0 0 52mm', display: 'flex', flexDirection: 'column', border: '1.5px solid #111' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 8mm 12mm', borderBottom: '1px solid #111', fontSize: '7pt', fontWeight: 700, textAlign: 'center' }}>
              <div style={{ borderRight: '1px solid #111', padding: '1mm' }}>Process</div>
              <div style={{ borderRight: '1px solid #111', padding: '1mm' }}></div>
              <div style={{ padding: '1mm', lineHeight: 1.1 }}>No. of<br />Books</div>
            </div>
            {/* Row 1 – empty circle + book count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 8mm 12mm', borderBottom: '1px solid #111', flex: 1 }}>
              <div style={{ borderRight: '1px solid #111', padding: '1.5mm 2mm', fontSize: '8pt', lineHeight: 1.15 }}>Inventory &amp; Registration</div>
              <div style={{ borderRight: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #111', background: 'transparent', display: 'inline-block' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14pt', fontWeight: 300 }}>{printBooks.length || printBox.total_books_expected || '—'}</div>
            </div>
            {/* Rows 2-5 – empty circle, no book count (filled manually) */}
            {printProcessRows.slice(1).map((label) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 8mm 12mm', borderBottom: '1px solid #111', flex: 1 }}>
                <div style={{ borderRight: '1px solid #111', padding: '1.5mm 2mm', fontSize: '8pt', lineHeight: 1.15 }}>{label}</div>
                <div style={{ borderRight: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #111', background: 'transparent', display: 'inline-block' }} />
                </div>
                <div style={{ borderRight: '1px solid #111' }} />
              </div>
            ))}
            {/* Remarks */}
            <div style={{ borderTop: '1px solid #111', padding: '1.5mm 2mm', fontSize: '6pt', lineHeight: 1.4, flex: '0 0 auto' }}>
              <div style={{ fontWeight: 700, fontSize: '7pt', marginBottom: '0.5mm' }}>REMARKS</div>
              <div>Mismatch Title-</div>
              <div>Rejects -</div>
              <div>Excess (not in the PL) -</div>
              <div>Duplicate -</div>
              <div>Not yet approved -</div>
              <div>Mix Box -</div>
            </div>
          </div>

          {/* ── RIGHT: bordered box with 3 sections + barcode below ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
            {/* 3-section bordered box */}
            <div style={{ flex: 1, border: '2px solid #111', display: 'flex', flexDirection: 'column' }}>
              {/* Section 1: Type */}
              <div style={{ borderBottom: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1mm 2mm', flex: '0 0 auto' }}>
                <span style={{ fontSize: '26pt', fontWeight: 900, letterSpacing: '-0.5px', textAlign: 'center', lineHeight: 1, textTransform: 'uppercase' }}>
                  Mustang
                </span>
              </div>
              {/* Section 2: Lot number */}
              <div style={{ borderBottom: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1mm 2mm', flex: 1 }}>
                <span style={{ fontSize: '18pt', fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>
                  {printBox.lot?.lot_number || '—'}
                </span>
              </div>
              {/* Section 3: Box sequence number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1mm 2mm', flex: 1 }}>
                <span style={{ fontSize: '46pt', fontWeight: 900, textAlign: 'center', lineHeight: 1, letterSpacing: '-1px' }}>
                  {(() => {
                    const m = printBox.box_number.match(/-0*([1-9]\d*)$/)
                    return m ? m[1] : printBox.box_number
                  })()}
                </span>
              </div>
            </div>
            {/* Barcode below the box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5mm' }}>
              <canvas ref={qrRef} width={600} height={120} style={{ width: '100%', height: '14mm', imageRendering: 'pixelated', display: 'block' }} />
              <div style={{ fontSize: '5pt', textAlign: 'center', wordBreak: 'break-all' }}>{printBox.box_number}</div>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="flex h-screen overflow-hidden bg-background print:hidden">
      <DashboardSidebar navigationLocked={verifSessionActive} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar disableBrandToggle={verifSessionActive} navigationLocked={verifSessionActive} />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">

          {/* Header */}
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h1>
              <p className="text-sm text-muted-foreground mt-1">Browse all boxes and their contents</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={fetchBoxes}
                disabled={loadingBoxes}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingBoxes ? 'animate-spin' : ''}`}  />
                Refresh
              </button>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{lastInventoryUpdateLabel}</p>
            </div>
          </header>

          {/* ── Tab Navigation ── */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
            {(
              [
                { key: 'incoming',     label: 'Incoming Boxes',    icon: Inbox,         count: incomingBoxes.length,  activeColor: 'bg-cyan-100 text-cyan-700' },
                { key: 'verification', label: 'Book Verification', icon: ClipboardCheck, count: inventoryBoxes.length, activeColor: 'bg-amber-100 text-amber-700' },
                { key: 'outgoing',     label: 'Outgoing Boxes',    icon: Send,          count: outgoingBoxes.length,  activeColor: 'bg-emerald-100 text-emerald-700' },
              ] as const
            ).map(({ key, label, icon: Icon, count, activeColor }) => (
              <button
                key={key}
                disabled={verifSessionActive}
                onClick={() => setInventoryTab(key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  inventoryTab === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${inventoryTab === key ? activeColor : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB: INCOMING BOXES                                              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {inventoryTab === 'incoming' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                {loadingBoxes ? 'Loading…' : `${incomingBoxes.length} box${incomingBoxes.length !== 1 ? 'es' : ''} waiting to be received`}
              </p>
              {loadingBoxes ? (
                <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading boxes…
                </div>
              ) : incomingBoxes.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-3 text-center">
                  <div className="bg-cyan-50 rounded-full p-5"><Inbox className="h-8 w-8 text-cyan-400" /></div>
                  <p className="text-sm font-semibold text-foreground">No incoming boxes</p>
                  <p className="text-xs text-muted-foreground max-w-xs">Boxes sent by the warehouse will appear here, ready for you to receive.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {incomingBoxes.map(box => {
                    const rawScans = box.scans as any[]
                    const bookCount = (() => {
                      if (Array.isArray(rawScans) && rawScans.length > 0) {
                        const first = rawScans[0]
                        if (typeof first?.count !== 'undefined') return parseInt(first.count) || 0
                      }
                      return box.total_books_expected || 0
                    })()
                    return (
                      <div key={box.id} className="border border-border rounded-xl bg-card flex items-center px-4 py-3 gap-4">
                        {/* Icon */}
                        <div className="bg-cyan-50 rounded-lg p-2 shrink-0">
                          <Package className="h-5 w-5 text-cyan-600" />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                          <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                        </div>
                        {/* Created date */}
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                          {box.created_at ? new Date(box.created_at).toLocaleDateString() : ''}
                        </span>
                        {/* Received button */}
                        <button
                          onClick={() => handleReceiveBox(box)}
                          disabled={receivingBox === box.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60 transition-colors shrink-0"
                        >
                          {receivingBox === box.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <CheckCircle2 className="h-4 w-4" />}
                          {receivingBox === box.id ? 'Receiving…' : 'Received'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB: BOOK VERIFICATION                                           */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {inventoryTab === 'verification' && (
            <div className="flex flex-col gap-4">

              {/* Confirm complete modal */}
              {verifConfirmComplete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setVerifConfirmComplete(false)}>
                  <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="text-base font-semibold text-foreground mb-4">Complete Verification</h3>


                    {/* Scan Log Summary */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-foreground mb-2 block">Scanned Books Summary</label>
                      <div className="max-h-80 overflow-y-auto border border-border rounded-lg bg-card divide-y divide-border">
                        {verifScannedBooks.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">No books scanned.</div>
                        ) : (
                          verifScannedBooks.map((book, idx) => (
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
                        * Total {verifScannedBooks.length} scanned books will be saved to the database when you confirm.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => {
                        setVerifConfirmComplete(false)
                        setVerifTotalBooksExpected('')
                        setVerifIssueIsbn('')
                        setVerifIssues([])
                      }} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                      <button onClick={handleCompleteVerifSession} disabled={loadingVerifBooks} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50">
                        {loadingVerifBooks ? 'Completing…' : 'Confirm Complete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Flag / Edit Flag Modal */}
              {verifFlagModalBook && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setVerifFlagModalBook(null)}>
                  <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        {verifFlagModalBook.scan_status === 'non_processable' ? 'Edit Flag' : 'Flag as Non-Processable'}
                      </h3>
                      <button onClick={() => setVerifFlagModalBook(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{verifFlagModalBook.isbn} — {verifFlagModalBook.title} — {verifFlagModalBook.author}</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Issue</label>
                        <select value={verifFlagIssue} onChange={e => setVerifFlagIssue(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">Select issue…</option>
                          {FLAG_ISSUES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Remarks / Page No. (optional)</label>
                        <input type="text" value={verifFlagRemarks} onChange={e => setVerifFlagRemarks(e.target.value)}
                          placeholder="e.g. page 42"
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                      <button onClick={() => setVerifFlagModalBook(null)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                      <button onClick={saveVerifFlagFromLog} disabled={!verifFlagIssue || verifFlagSaving}
                        className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium disabled:opacity-50">
                        {verifFlagSaving ? 'Saving…' : verifFlagModalBook.scan_status === 'non_processable' ? 'Save Changes' : 'Confirm Flag'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!verifSessionActive ? (
                /* ── Box list for verification ── */
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground">
                    {loadingBoxes ? 'Loading…' : `${inventoryBoxes.length} box${inventoryBoxes.length !== 1 ? 'es' : ''} awaiting verification`}
                  </p>
                  {loadingBoxes ? (
                    <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading boxes…
                    </div>
                  ) : inventoryBoxes.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-3 text-center">
                      <div className="bg-amber-50 rounded-full p-5"><ClipboardCheck className="h-8 w-8 text-amber-400" /></div>
                      <p className="text-sm font-semibold text-foreground">No boxes to verify</p>
                      <p className="text-xs text-muted-foreground max-w-xs">Receive boxes from the Incoming Boxes tab first.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {inventoryBoxes.map(box => {
                        const isExpanded = verifExpandedBoxId === box.id
                        const rowBooks = verifRowBooks[box.id] || []
                        const isLoadingBooks = loadingVerifRowBooks === box.id
                        const bookCount = box.total_books_expected || 0
                        const stuckSession = box.box_sessions?.find(s => s.status === 'in_progress' && s.inventory_user_scan === verifUserId)
                        return (
                          <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden">
                            {/* Row header — same style as Incoming Boxes */}
                            <div className="flex items-center px-4 py-3 gap-4">
                              {/* Expand chevron */}
                              <button
                                onClick={() => toggleVerifRow(box.id)}
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                              {/* Icon */}
                              <div className={`${stuckSession ? 'bg-orange-50' : 'bg-amber-50'} rounded-lg p-2 shrink-0`}>
                                <Package className={`h-5 w-5 ${stuckSession ? 'text-orange-500' : 'text-amber-600'}`} />
                              </div>
                              {/* Info — clickable to expand */}
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleVerifRow(box.id)}>
                                <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                              </div>
                              {/* Date + stuck badge */}
                              <div className="shrink-0 hidden sm:flex flex-col items-end gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {box.created_at ? new Date(box.created_at).toLocaleDateString() : ''}
                                </span>
                                {stuckSession && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                                    ⚠ In Progress Stuck
                                  </span>
                                )}
                              </div>
                              {/* Start Session button */}
                              <button
                                onClick={() => handleStartVerifSession(box.id)}
                                disabled={loadingVerifBooks}
                                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60 transition-colors shrink-0 ${stuckSession ? 'bg-orange-500 hover:bg-orange-600' : 'bg-amber-600 hover:bg-amber-700'}`}
                              >
                                {loadingVerifBooks
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <ClipboardList className="h-4 w-4" />}
                                {loadingVerifBooks ? 'Starting…' : stuckSession ? 'Resume Session' : 'Start Session'}
                              </button>
                            </div>
                            {/* Expandable books list */}
                            {isExpanded && (
                              <div className="border-t border-border px-5 py-3 bg-muted/30">
                                {isLoadingBooks ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
                                  </div>
                                ) : rowBooks.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
                                ) : (
                                  <div className="flex flex-col gap-0">
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
              ) : verifBox && (
                <>
                  {/* ── Active session bar ── */}
                  <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4">
                    <div className="flex items-center gap-4">
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Active Lot</p>
                        <p className="text-sm font-semibold text-foreground">{verifBox.lot?.lot_number || '—'}</p>
                      </div>
                      {verifBox.box_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">Current Box</p>
                          <p className="text-sm font-semibold text-foreground">{verifBox.box_number} ({verifCurrentBoxBooks} books)</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">User</p>
                        <p className="text-sm font-semibold text-foreground">{verifUserName || 'Unknown User'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleResetVerifSession}
                        className="px-4 py-1.5 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors">
                        Reset Session
                      </button>
                      <button onClick={handleOpenVerifComplete} disabled={
                          loadingVerifBooks || 
                          verifScannedBooks.length === 0 ||
                          verifScannedBooks.length !== warehouseBooks.length ||
                          !warehouseBooks.every(wb => verifScannedBooks.some(vb => vb.isbn === wb.isbn))
                        }
                        className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Complete Session
                      </button>
                    </div>
                  </div>

                  {/* ── Book count stats ── */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium">Total Scanned</p>
                      <p className="text-2xl font-bold text-blue-900">{verifCurrentSession?.total_scanned || 0}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-green-600 font-medium">Processable</p>
                      <p className="text-2xl font-bold text-green-900">{verifCurrentSession?.total_processable || 0}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-600 font-medium">Non-Processable</p>
                      <p className="text-2xl font-bold text-red-900">{verifCurrentSession?.total_non_processable || 0}</p>
                    </div>
                  </div>

                  {/* ── Scanner ── */}
                  <ScannerInput onScan={handleVerifScan} />

                  {/* ── Side-by-Side Warehouse and Inventory Tables ── */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Warehouse Table (Left) - Read Only */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-blue-600">Warehouse Scans</h3>
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
                        <p className="text-sm text-muted-foreground py-6 text-center">No warehouse scans found for this box.</p>
                      ) : (
                        <div className="overflow-y-auto max-h-96">
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                            <div className="col-span-2">ISBN</div>
                            <div className="col-span-3">Book Title</div>
                            <div className="col-span-3">Book Author</div>
                            <div className="col-span-3 text-right">Status</div>
                            <div className="col-span-1"></div>
                          </div>
                          <div className="space-y-1.5">
                            {warehouseBooks
                              .map((book) => {
                                const inventoryBook = verifScannedBooks.find(ib => ib.isbn === book.isbn)
                                const isMatch = inventoryBook && inventoryBook.scan_status === book.scan_status
                                return { book, isMatch }
                              })
                              .sort((a, b) => (a.isMatch === b.isMatch ? 0 : a.isMatch ? -1 : 1))
                              .map(({ book, isMatch }, i) => (
                                <div key={i} className={`grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center ${
                                  isMatch ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                                }`}>
                                  <div className="col-span-2">
                                    <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                                  </div>
                                  <div className="col-span-3">
                                    <p className="text-[11px] text-foreground truncate">{book.title}</p>
                                  </div>
                                  <div className="col-span-3">
                                    <p className="text-[11px] text-foreground truncate">—</p>
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

                    {/* Inventory Table (Right) - Editable */}
                    <div className="bg-card border-2 border-green-500 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-green-600" />
                          <h3 className="text-sm font-semibold text-green-600">Inventory Scans</h3>
                          <span className="text-xs text-muted-foreground">({verifScannedBooks.length} books)</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium border border-green-200">
                          Currently Verifying
                        </span>
                      </div>
                      
                      {verifScannedBooks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No books scanned yet.</p>
                      ) : (
                        <div className="overflow-y-auto max-h-96">
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                            <div className="col-span-2">ISBN</div>
                            <div className="col-span-3">Book Title</div>
                            <div className="col-span-3">Book Author</div>
                            <div className="col-span-3 text-right">Status</div>
                            <div className="col-span-1 text-right">Action</div>
                          </div>
                          <div className="space-y-1.5">
                            {verifScannedBooks
                              .map((book) => {
                                const warehouseBook = warehouseBooks.find(wb => wb.isbn === book.isbn)
                                const isMatch = warehouseBook && warehouseBook.scan_status === book.scan_status
                                return { book, isMatch }
                              })
                              .sort((a, b) => b.book.timestamp.getTime() - a.book.timestamp.getTime())
                              .map(({ book, isMatch }, i) => (
                                <div key={`${book.id}-${i}`} className={`grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center ${
                                  isMatch ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                                }`}>
                                  <div className="col-span-2">
                                    <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                                  </div>
                                  <div className="col-span-3">
                                    <p className="text-[11px] text-foreground truncate">{book.title}</p>
                                    {book.flag_issue && (
                                      <p className="text-[10px] text-red-600 mt-0.5">{issueLabel(book.flag_issue)}{book.flag_remarks ? ` — ${book.flag_remarks}` : ''}</p>
                                    )}
                                  </div>
                                  <div className="col-span-3">
                                    <p className="text-[11px] text-foreground truncate">{book.author}</p>
                                  </div>
                                  <div className="col-span-3 flex items-center justify-end gap-2">
                                    {book.scan_status === 'processable' ? (
                                      <>
                                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-200 text-green-800 whitespace-nowrap">Processable</span>
                                        <button onClick={() => openVerifFlagModal(book)} className="text-[10px] text-muted-foreground hover:text-destructive underline whitespace-nowrap">Flag</button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-200 text-red-800 whitespace-nowrap">
                                          <AlertTriangle className="h-2.5 w-2.5" /> Non-Processable
                                        </span>
                                        <button onClick={() => openVerifFlagModal(book)} className="text-[10px] text-muted-foreground hover:text-blue-600 underline whitespace-nowrap">Edit</button>
                                      </>
                                    )}
                                  </div>
                                  <div className="col-span-1 flex items-center justify-end">
                                    <button onClick={() => handleRemoveVerifBook(book.id)} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors" title="Remove from verification log">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center justify-center gap-6 text-xs">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                        <span className="text-muted-foreground">Match (Warehouse = Inventory)</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                        <span className="text-muted-foreground">Mismatch (Different status or missing)</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB: OUTGOING BOXES                                              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {inventoryTab === 'outgoing' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                {loadingBoxes ? 'Loading…' : `${outgoingBoxes.length} box${outgoingBoxes.length !== 1 ? 'es' : ''} ready to send to Cut`}
              </p>
              {loadingBoxes ? (
                <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : outgoingBoxes.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-3 text-center">
                  <div className="bg-emerald-50 rounded-full p-5"><Send className="h-8 w-8 text-emerald-400" /></div>
                  <p className="text-sm font-semibold text-foreground">No outgoing boxes yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">Complete a verification session in the Book Verification tab to add boxes here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {outgoingBoxes.map(box => {
                    const rawScans = box.scans as any[]
                    const bookCount = (() => {
                      if (Array.isArray(rawScans) && rawScans.length > 0) {
                        const first = rawScans[0]
                        if (typeof first?.count !== 'undefined') return parseInt(first.count) || 0
                      }
                      return box.total_books_expected || 0
                    })()
                    return (
                      <div key={box.id} className="border border-border rounded-xl bg-card flex items-center px-4 py-3 gap-4">
                        {/* Icon */}
                        <div className="bg-emerald-50 rounded-lg p-2 shrink-0">
                          <Package className="h-5 w-5 text-emerald-600" />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Verified</span>
                          </div>
                          <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                        </div>
                        {/* Send button */}
                        <button
                          onClick={() => handleSendToCut(box)}
                          disabled={sendingToCut === box.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shrink-0"
                        >
                          {sendingToCut === box.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Send className="h-4 w-4" />}
                          {sendingToCut === box.id ? 'Sending…' : 'Send to Cut'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
      {/* Simflex Check Modal */}
      {simflexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !simflexModal.loading && setSimflexModal(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Simflex Transmission Check
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{simflexModal.box.box_number} · {simflexModal.box.lot?.lot_number}</p>
              </div>
              {!simflexModal.loading && (
                <button onClick={() => setSimflexModal(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
              )}
            </div>

            {/* Loading */}
            {simflexModal.loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p className="text-sm text-muted-foreground">Checking Simflex for all ISBNs in this box…</p>
              </div>
            )}

            {/* Error */}
            {!simflexModal.loading && simflexModal.error && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive font-medium">{simflexModal.error}</p>
                <button onClick={() => handleCheckSimflex(simflexModal.box)} className="text-xs underline text-muted-foreground">Retry</button>
              </div>
            )}

            {/* Result */}
            {!simflexModal.loading && simflexModal.result && (
              <div className="flex flex-col gap-4 overflow-hidden">
                {/* Summary banner */}
                <div className={`flex items-start gap-3 rounded-lg p-4 border ${
                  simflexModal.result.autoAdvanced
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  {simflexModal.result.autoAdvanced
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    : <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-sm font-semibold ${
                      simflexModal.result.autoAdvanced ? 'text-green-800' : 'text-amber-800'
                    }`}>
                      {simflexModal.result.message}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Total processable: <strong>{simflexModal.result.totalProcessable}</strong></span>
                      <span className="text-green-700">Completed: <strong>{simflexModal.result.completedCount}</strong></span>
                      {simflexModal.result.pendingCount > 0 && (
                        <span className="text-amber-700">Pending: <strong>{simflexModal.result.pendingCount}</strong></span>
                      )}
                    </div>
                    {simflexModal.result.autoAdvanced && (
                      <p className="text-xs text-green-700 mt-1 font-medium">Box stage updated: Scan → Transmit → Storage</p>
                    )}
                  </div>
                </div>

                {/* ISBN table */}
                <div className="overflow-y-auto flex-1 rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card border-b border-border">
                      <tr className="text-muted-foreground">
                        <th className="pb-2 pt-2 px-3 text-left font-medium">#</th>
                        <th className="pb-2 pt-2 px-3 text-left font-medium">ISBN</th>
                        <th className="pb-2 pt-2 px-3 text-left font-medium">Simflex Box</th>
                        <th className="pb-2 pt-2 px-3 text-left font-medium">Latest Status</th>
                        <th className="pb-2 pt-2 px-3 text-center font-medium">Transmitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simflexModal.result.simflexResults.map((r, i) => (
                        <tr key={r.isbn} className="border-b border-border/40 last:border-0">
                          <td className="py-1.5 px-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-1.5 px-3 text-foreground">{r.isbn}</td>
                          <td className="py-1.5 px-3 text-muted-foreground">{r.boxNumber || '—'}</td>
                          <td className="py-1.5 px-3 text-muted-foreground max-w-[180px] truncate" title={r.latestStatus || ''}>
                            {r.latestStatus || <span className="italic">Not in Simflex</span>}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            {r.transmissionCompleted
                              ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                              : <XCircle className="h-4 w-4 text-amber-500 mx-auto" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setSimflexModal(null)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scanned Box Contents Modal */}
      {(scannedBoxModal || loadingScannedBox) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setScannedBoxModal(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{scannedBoxModal?.box.box_number}</h3>
                <p className="text-xs text-muted-foreground">
                  {scannedBoxModal?.box.lot?.lot_number} · <span className="capitalize">{scannedBoxModal?.box.current_stage}</span> · {scannedBoxModal?.box.total_books_expected} books
                </p>
              </div>
              <button onClick={() => setScannedBoxModal(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            {loadingScannedBox ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading contents...</p>
            ) : scannedBoxModal && scannedBoxModal.books.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No scan records found for this box.</p>
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
                    {scannedBoxModal?.books.map((book, i) => (
                      <tr key={book.id} className="border-b border-border/40 last:border-0">
                        <td className="py-1.5 text-muted-foreground pr-2">{i + 1}</td>
                        <td className="py-1.5 pr-3">{book.isbn}</td>
                        <td className="py-1.5 pr-3 max-w-[260px] truncate text-foreground">{book.title || '—'}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : book.scan_status === 'non_processable' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>{book.scan_status === 'processable' ? 'Processable' : book.scan_status === 'non_processable' ? 'Non-Processable' : book.scan_status}</span>
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
    </div>

      
    </>
  )
}
