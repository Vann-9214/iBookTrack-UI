'use client'

import { useState, useEffect, useRef } from 'react'
import { authFetch, fetchUserProfile } from '@/lib/auth-api'
import { useBrand } from '@/hooks/use-brand'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScannerInput } from '@/components/scanner-input'
import { useToast } from '@/hooks/use-toast'
import { Package, Search, ChevronDown, ChevronRight, X, BookOpen, Printer, Zap, CheckCircle2, XCircle, Loader2, AlertTriangle, Trash2, Inbox, ClipboardCheck, ArrowRight, Send, ClipboardList, RefreshCw, ScanBarcode, CircleCheck, CircleX, Warehouse, Archive } from "lucide-react"
import { RefreshControl } from '@/components/refresh-control'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bwipjs = require('bwip-js')



interface BookInBox {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  scanned_at: string
  book_type?: string
  flag?: {
    issue: string
    remarks: string
  }
}

interface Box {
  id: string
  box_number: string
  lot_id: string
  total_books_expected: number
  books_transmitted: number
  current_stage: string
  created_at: string
  lot: { lot_number: string; status: string; type?: string }
  books: BookInBox[] | { count: number }[]
  scans: { count: number }[]
  box_sessions?: { 
    id?: string; 
    status: string; 
    warehouse_user_received?: string; 
    inventory_user_received?: string; 
    endorsement_user_received?: string; 
    inventory_user_send?: string; 
    warehouse_time_received?: string;
    total_scanned?: number;
    inventory_time_received?: string;
    inventory_time_send?: string;
  }[]
  latest_inventory_scan_at?: string | null
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
  const { brand, colors } = useBrand()
  const { toast } = useToast()
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<Date | null>(null)

  // --- Boxes tab state ---
  const [boxes, setBoxes] = useState<Box[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'box' | 'lot' | 'isbn'>('box')
  const [expandedBox, setExpandedBox] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingBoxes, setLoadingBoxes] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState<string | null>(null)
  const [printBox, setPrintBox] = useState<Box | null>(null)
  const [printBooks, setPrintBooks] = useState<BookInBox[]>([])
  const [printBookType, setPrintBookType] = useState<string>('')
  const [loadingPrint, setLoadingPrint] = useState<string | null>(null)
  const qrRef = useRef<HTMLCanvasElement>(null)

  // --- Outgoing boxes book list ---
  const [outgoingExpandedBoxId, setOutgoingExpandedBoxId] = useState<string | null>(null)
  const [outgoingLoadingBooks, setOutgoingLoadingBooks] = useState<string | null>(null)

  // --- Per-book print slip ---
  const [printBook, setPrintBook] = useState<{ book: BookInBox; box: Box } | null>(null)
  const [loadingBookPrint, setLoadingBookPrint] = useState<string | null>(null)
  const bookQrRef = useRef<HTMLCanvasElement>(null)

  // --- Print-completion tracking (per box) ---
  // printedBoxLabels: set of box IDs whose box label has been printed
  // printedBookSlips: map of boxId â†’ set of book IDs whose slip has been printed
  const [printedBoxLabels, setPrintedBoxLabels] = useState<Set<string>>(new Set())
  const [printedBookSlips, setPrintedBookSlips] = useState<Record<string, Set<string>>>({})
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




  useEffect(() => {
    const timer = setTimeout(() => { fetchBoxes() }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchType, brand])

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


  const fetchBoxes = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoadingBoxes(true)
    try {
      let url = `${API_URL}/api/boxes`
      const params: string[] = []
      params.push(`box_type=${brand}`)
      params.push(`current_stage=warehouse,inventory`)
      const query = searchQuery.trim()
      if (searchType === 'box' && query) params.push(`box_number=${encodeURIComponent(query)}`)
      if (searchType === 'isbn' && query) params.push(`isbn=${encodeURIComponent(query)}`)
      if (params.length) url += '?' + params.join('&')

      const res = await authFetch(url)
      const data = await res.json()
      let result: Box[] = data.boxes || []

      if (searchType === 'lot' && query) {
        const q = query.toLowerCase()
        result = result.filter(b => (b.lot?.lot_number || '').toLowerCase().includes(q))
      }
      setBoxes(result)
      setLastInventoryUpdate(new Date())
    } catch (e) {
      console.error('Failed to fetch boxes:', e)
    } finally {
      if (!options?.silent) setLoadingBoxes(false)
    }
  }

  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    try {
      await fetchBoxes({ silent: true })
    } finally {
      setIsManualRefreshing(false)
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
        .map(type => type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())[0] || 'â€”'

      setPrintBox(box)
      setPrintBooks(books)
      setPrintBookType(derivedType)
    } catch (e) {
      console.error('Failed to fetch books for label:', e)
    } finally {
      setLoadingPrint(null)
    }
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

  // â”€â”€ Tab navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [inventoryTab, setInventoryTab] = useState<'incoming' | 'verification' | 'outgoing'>('incoming')

  // â”€â”€ Verified box IDs (session-complete â†’ outgoing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Boxes move here after a verification session is completed (still inventory stage in DB).
  // â”€â”€ Book Verification list: expandable row state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Incoming: Receive box (warehouse â†’ inventory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Book Verification: session state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Warehouse Data for Side-by-Side View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [warehouseBooks, setWarehouseBooks] = useState<WarehouseBook[]>([])
  const [loadingWarehouseBooks, setLoadingWarehouseBooks] = useState(false)

  const issueLabel = (val: string) => FLAG_ISSUES.find(i => i.value === val)?.label || val

  // â”€â”€ Fetch Warehouse Books for Comparison â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    const cleanedIsbn = isbn.trim()
    if (verifScannedBooks.some(b => b.isbn.trim().toLowerCase() === cleanedIsbn.toLowerCase())) {
      toast({ title: 'Duplicate Scan', description: 'This book has already been scanned in this session.', variant: 'destructive' })
      return
    }

    const warehouseBook = warehouseBooks.find(wb => wb.isbn.trim().toLowerCase() === cleanedIsbn.toLowerCase());
    if (warehouseBook?.rejection_reason === 'missing') {
      toast({ title: 'Cannot Scan Missing Book', description: 'This book was marked as missing by the warehouse and cannot be verified.', variant: 'destructive' })
      return
    }

    const expectedWarehouseBooksCount = warehouseBooks.filter(wb => wb.rejection_reason !== 'missing').length;
    if (verifScannedBooks.length >= expectedWarehouseBooksCount) {
      toast({ 
        title: 'Scan Limit Reached', 
        description: `You cannot scan more than the expected number of books (${expectedWarehouseBooksCount}).`, 
        variant: 'destructive' 
      })
      return
    }

    setLoadingVerifBooks(true)
    // Look up warehouse status for this ISBN so the inventory scan inherits it
    const warehouseStatus = warehouseBooks.find(wb => wb.isbn.trim().toLowerCase() === cleanedIsbn.toLowerCase())?.scan_status ?? 'processable'
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
          notes: flag_remarks || null,
          stage: 'inventory'
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
      toast({ title: 'Error', description: 'This book was already scanned successfully in this session.', variant: 'destructive' })
      setVerifIssueIsbn('')
      return
    }
    
    if (verifIssues.some(i => i.isbn === verifIssueIsbn.trim())) {
      toast({ title: 'Error', description: 'This issue has already been added.', variant: 'destructive' })
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

    const expectedWarehouseBooks = warehouseBooks.filter(wb => wb.rejection_reason !== 'missing');
    
    const isFullyMatched = expectedWarehouseBooks.length === verifScannedBooks.length &&
      expectedWarehouseBooks.every(wb => verifScannedBooks.some(vb => vb.isbn === wb.isbn));
      
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

  // â”€â”€ Outgoing: Send to Cut (inventory â†’ cut) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sendingToCut, setSendingToCut] = useState<string | null>(null)

  const handleSendToCut = async (box: Box) => {
    setSendingToCut(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/send-forward`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Sent to Cut from Inventory Outgoing' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send to cut')
      fetchBoxes()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send to cut')
    } finally {
      setSendingToCut(null)
    }
  }

  // â”€â”€ Outgoing: expand/collapse box to show its books â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleOutgoingBox = async (box: Box) => {
    if (outgoingExpandedBoxId === box.id) {
      setOutgoingExpandedBoxId(null)
      return
    }
    setOutgoingExpandedBoxId(box.id)
    if (!boxBooks[box.id]) {
      setOutgoingLoadingBooks(box.id)
      try {
        const res = await authFetch(`${API_URL}/api/boxes/${box.id}`)
        const data = await res.json()
        const books: BookInBox[] = data.box?.books || []
        setBoxBooks(prev => ({ ...prev, [box.id]: books }))
      } catch (e) {
        console.error('Failed to load books for outgoing box:', e)
      } finally {
        setOutgoingLoadingBooks(null)
      }
    }
  }

  const handlePrintBookSlip = (book: BookInBox, box: Box) => {
    setLoadingBookPrint(`${box.id}-${book.id}`)
    setPrintBook({ book, box })
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
      // QR code encoding: LOT|BOX|TYPE + per-book ISBN=STATUS lines
      if (qrRef.current) {
        try {
          const bookLines = printBooks
            .map(b => `${b.isbn}=${b.scan_status === 'processable' ? 'P' : 'NP'}`)
            .join(';')
          const qrText = [
            `LOT:${printBox.lot?.lot_number || ''}`,
            `BOX:${printBox.box_number}`,
            `TYPE:${printBookType || 'Mustang'}`,
            bookLines ? `BOOKS:${bookLines}` : '',
          ].filter(Boolean).join('|')

          qrRef.current.width = 300
          qrRef.current.height = 300
          bwipjs.toCanvas(qrRef.current, {
            bcid: 'qrcode',
            text: qrText,
            scale: 4,
            eclevel: 'M',
          })
        } catch (e) {
          console.error('QR code error:', e)
        }
      }
    }

    let printTimer: ReturnType<typeof setTimeout> | null = null

    const timer = setTimeout(() => {
      render()
      // Wait briefly for the canvas to paint, then open the browser print dialog
      printTimer = setTimeout(() => {
        window.print()
      }, 100)
    }, 50)

    const boxId = printBox.id
    const onAfterPrint = () => {
      setPrintBox(null)
      // Mark this box's label as printed
      setPrintedBoxLabels(prev => new Set(prev).add(boxId))
    }
    window.addEventListener('afterprint', onAfterPrint)

    return () => {
      clearTimeout(timer)
      if (printTimer) clearTimeout(printTimer)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [printBox])

  // â”€â”€ Book slip: render barcode then trigger print â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!printBook) return

    const render = () => {
      if (bookQrRef.current) {
        try {
          bookQrRef.current.width = 600
          bookQrRef.current.height = 120
          bwipjs.toCanvas(bookQrRef.current, {
            bcid: 'code128',
            text: printBook.book.isbn,
            scale: 3,
            height: 18,
            includetext: false,
            paddingwidth: 4,
            paddingheight: 2,
          })
        } catch (e) {
          console.error('Book barcode error:', e)
        }
      }
    }

    let printTimer: ReturnType<typeof setTimeout> | null = null

    const timer = setTimeout(() => {
      render()
      printTimer = setTimeout(() => {
        window.print()
      }, 100)
    }, 50)

    const snapBoxId = printBook.box.id
    const snapBookId = printBook.book.id
    const onAfterPrint = () => {
      setPrintBook(null)
      setLoadingBookPrint(null)
      // Mark this book's slip as printed for its box
      setPrintedBookSlips(prev => {
        const next = { ...prev }
        const existing = next[snapBoxId] ? new Set(next[snapBoxId]) : new Set<string>()
        existing.add(snapBookId)
        next[snapBoxId] = existing
        return next
      })
    }
    window.addEventListener('afterprint', onAfterPrint)

    return () => {
      clearTimeout(timer)
      if (printTimer) clearTimeout(printTimer)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [printBook])

  // Brand filter helper â€” lot.type must match the active brand toggle (case-insensitive)
  const matchesBrand = (b: Box) => !b.lot?.type || b.lot.type.toLowerCase() === brand.toLowerCase()

  // Incoming Boxes â€” warehouse stage, matching brand
  const incomingBoxes = boxes.filter(b => 
    b.current_stage === 'warehouse' && 
    b.box_sessions?.some(s => s.status === 'completed') &&
    matchesBrand(b)
  )

  // Book Verification â€” inventory stage, session is received/in_progress (not yet fully verified), matching brand
  // Session lifecycle: completed (warehouse) â†’ received (inventory received) â†’ in_progress (verifying) â†’ completed (verified â†’ outgoing)
  const inventoryBoxes = boxes.filter(b => {
    if (b.current_stage !== 'inventory') return false
    if (!matchesBrand(b)) return false
    const sessions = b.box_sessions || []
    // If there's a completed or sent session it has been verified â†’ goes to outgoing or cut tab instead
    if (sessions.some(s => s.status === 'completed' || s.status === 'sent')) return false
    // Only hide in_progress boxes that are locked to a DIFFERENT user.
    // If inventory_user_send is null/unset, the box is available to everyone.
    if (verifUserId) {
      const inProgressSession = sessions.find(s => s.status === 'in_progress')
      if (
        inProgressSession &&
        inProgressSession.inventory_user_send &&
        inProgressSession.inventory_user_send !== verifUserId
      ) return false
    }
    return true
  })

  // Outgoing Boxes â€” inventory stage + verified this session, matching brand
  const outgoingBoxes = boxes.filter(b => 
    b.current_stage === 'inventory' && 
    b.box_sessions?.some(s => s.status === 'completed') &&
    matchesBrand(b)
  )

  const normalizeVerifIsbn = (isbn: string) => isbn.trim().toLowerCase()
  const verifProcessableBooks = verifScannedBooks.filter(book => book.scan_status === 'processable')
  const verifBlockedBooks = verifScannedBooks.filter(book => book.scan_status === 'non_processable')
  const verifMissingBooks = warehouseBooks.filter(book =>
    book.rejection_reason === 'missing' &&
    !verifScannedBooks.some(scanned => normalizeVerifIsbn(scanned.isbn) === normalizeVerifIsbn(book.isbn))
  )

  return (
    <>
    {/* â”€â”€ DELETE BOX CONFIRM DIALOG â”€â”€ */}
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
              {deleting ? 'Deletingâ€¦' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* â”€â”€ PRINT LABEL OVERLAY (print-only) A6 landscape yellow label â”€â”€ */}
    {printBox && (
      <div className="hidden print:flex print:fixed print:inset-0 print:bg-white print:z-[9999] print:items-start print:justify-start">
        {/*
          A6 landscape = 148mm â”œÃ¹ 105mm.
          At 96dpi: 148mm Î“Ã«Ãª 559px, 105mm Î“Ã«Ãª 397px.
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
          {/* â”€â”€ LEFT: Process table + Remarks â”€â”€ */}
          <div style={{ flex: '0 0 52mm', display: 'flex', flexDirection: 'column', border: '1.5px solid #111' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 8mm 12mm', borderBottom: '1px solid #111', fontSize: '7pt', fontWeight: 700, textAlign: 'center' }}>
              <div style={{ borderRight: '1px solid #111', padding: '1mm' }}>Process</div>
              <div style={{ borderRight: '1px solid #111', padding: '1mm' }}></div>
              <div style={{ padding: '1mm', lineHeight: 1.1 }}>No. of<br />Books</div>
            </div>
            {/* Row 1 Î“Ã‡Ã´ empty circle + book count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 8mm 12mm', borderBottom: '1px solid #111', flex: 1 }}>
              <div style={{ borderRight: '1px solid #111', padding: '1.5mm 2mm', fontSize: '8pt', lineHeight: 1.15 }}>Inventory &amp; Registration</div>
              <div style={{ borderRight: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #111', background: 'transparent', display: 'inline-block' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14pt', fontWeight: 300 }}>{printBooks.length || printBox.total_books_expected || 'â€”'}</div>
            </div>
            {/* Rows 2-5 Î“Ã‡Ã´ empty circle, no book count (filled manually) */}
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

          {/* â”€â”€ RIGHT: bordered box with Type/Lot/Box + QR code below â”€â”€ */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
            {/* Top bordered box: Type, Lot, Box stacked */}
            <div style={{ border: '2px solid #111', display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
              {/* Section 1: Type */}
              <div style={{ borderBottom: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8mm 2mm' }}>
                <span style={{ fontSize: '22pt', fontWeight: 900, letterSpacing: '-0.5px', textAlign: 'center', lineHeight: 1, textTransform: 'uppercase' }}>
                  {printBookType || 'Mustang'}
                </span>
              </div>
              {/* Section 2: Lot number */}
              <div style={{ borderBottom: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8mm 2mm' }}>
                <span style={{ fontSize: '15pt', fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>
                  {printBox.lot?.lot_number || 'â€”'}
                </span>
              </div>
              {/* Section 3: Box sequence number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8mm 2mm' }}>
                <span style={{ fontSize: '34pt', fontWeight: 900, textAlign: 'center', lineHeight: 1, letterSpacing: '-1px' }}>
                  {(() => {
                    const m = printBox.box_number.match(/-0*([1-9]\d*)$/)
                    return m ? m[1] : printBox.box_number
                  })()}
                </span>
              </div>
            </div>
            {/* QR code below â€” square, fills remaining height */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5mm' }}>
              <canvas ref={qrRef} width={300} height={300} style={{ width: 'auto', height: '100%', maxHeight: '42mm', imageRendering: 'pixelated', display: 'block' }} />
              <div style={{ fontSize: '5pt', textAlign: 'center', wordBreak: 'break-all', color: '#555' }}>{printBox.box_number}</div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* â”€â”€ BOOK SLIP OVERLAY (print-only) A5 portrait â”€â”€ */}
    {printBook && (
      <div className="hidden print:flex print:fixed print:inset-0 print:bg-white print:z-[9999] print:items-start print:justify-start">
        <div style={{
          width: '148mm',
          minHeight: '105mm',
          backgroundColor: '#fff',
          border: '1.5px solid #111',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#111',
          boxSizing: 'border-box',
          padding: '5mm',
          gap: '3mm',
        }}>
          {/* Header */}
          <div style={{ borderBottom: '1.5px solid #111', paddingBottom: '2mm', marginBottom: '1mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Book Slip</span>
            <span style={{ fontSize: '8pt', color: '#555' }}>
              {printBook.box.lot?.lot_number ? `Lot: ${printBook.box.lot.lot_number}` : ''}
              {printBook.box.lot?.lot_number && printBook.box.box_number ? '  Â·  ' : ''}
              {printBook.box.box_number ? `Box: ${printBook.box.box_number}` : ''}
            </span>
          </div>

          {/* Barcode */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1mm' }}>
            <canvas ref={bookQrRef} width={600} height={120} style={{ width: '100%', maxWidth: '120mm', height: '14mm', imageRendering: 'pixelated', display: 'block' }} />
            <div style={{ fontSize: '7pt', textAlign: 'center', letterSpacing: '1px' }}>{printBook.book.isbn}</div>
          </div>

          {/* Book details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm', marginTop: '1mm' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '28mm 1fr', gap: '1mm 2mm', fontSize: '8pt' }}>
              <span style={{ fontWeight: 700, color: '#555' }}>ISBN</span>
              <span style={{ fontWeight: 600 }}>{printBook.book.isbn}</span>

              <span style={{ fontWeight: 700, color: '#555' }}>Type</span>
              <span>{printBook.book.book_type
                ? printBook.book.book_type.charAt(0).toUpperCase() + printBook.book.book_type.slice(1).toLowerCase()
                : 'â€”'}</span>

              <span style={{ fontWeight: 700, color: '#555' }}>Status</span>
              <span style={{ textTransform: 'capitalize' }}>{printBook.book.scan_status?.replace('_', ' ') || 'â€”'}</span>

              <span style={{ fontWeight: 700, color: '#555' }}>Box</span>
              <span>{printBook.box.box_number}</span>

              <span style={{ fontWeight: 700, color: '#555' }}>Lot</span>
              <span>{printBook.box.lot?.lot_number || 'â€”'}</span>
            </div>
          </div>

          {/* Signature line */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid #ccc', paddingTop: '2mm', display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: '#777' }}>
            <span>Received by: ___________________________</span>
            <span>Date: _______________</span>
          </div>
        </div>
      </div>
    )}

    <div className={cn("flex h-screen bg-background font-sans print:hidden", `theme-${brand}`)}>
      <DashboardSidebar navigationLocked={verifSessionActive} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardNavbar disableBrandToggle={verifSessionActive} navigationLocked={verifSessionActive} />
        <main className="flex-1 overflow-auto flex flex-col p-4 md:p-6 lg:p-8">
          <div className={cn("mx-auto w-full flex-1 flex flex-col", verifSessionActive ? "max-w-full" : "max-w-6xl")}>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                <Archive className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                  Inventory
                </h1>
                <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  Browse all boxes and their contents for <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-white", brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500')}>{brand}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Search bar */}
          {!verifSessionActive && (
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
                    val = val.replace(/\D/g, '').slice(0, 13)
                  }
                  setSearchQuery(val)
                }}
                inputMode={searchType === 'isbn' ? 'numeric' : 'text'}
                maxLength={searchType === 'isbn' ? 13 : undefined}
                placeholder={
                  searchType === 'isbn'
                    ? 'ISBN (10 or 13 digits)'
                    : searchType === 'lot'
                      ? 'Search by lot number...'
                      : 'Search by box number...'
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

          {/* â”€â”€ Tab Navigation â”€â”€ */}
          <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-px">
            {/* Incoming */}
            <button
              disabled={verifSessionActive}
              onClick={() => setInventoryTab('incoming')}
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
                inventoryTab === 'incoming'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Inbox className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Incoming</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                inventoryTab === 'incoming' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>{incomingBoxes.length}</span>
            </button>
            {/* Book Verification */}
            <button
              disabled={verifSessionActive}
              onClick={() => setInventoryTab('verification')}
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
                inventoryTab === 'verification'
                  ? 'bg-primary/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              style={inventoryTab === 'verification' ? {
                borderBottomColor: colors.accent,
                color: colors.accent,
                backgroundColor: `${colors.accent}14`,
              } : undefined}
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Book Verification</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  inventoryTab === 'verification' ? '' : 'bg-muted text-muted-foreground'
                )}
                style={inventoryTab === 'verification' ? {
                  backgroundColor: `${colors.accent}1A`,
                  color: colors.accent,
                } : undefined}
              >{inventoryBoxes.length}</span>
            </button>
            {/* Outgoing */}
            <button
              disabled={verifSessionActive}
              onClick={() => setInventoryTab('outgoing')}
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
                inventoryTab === 'outgoing'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Send className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Outgoing</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                inventoryTab === 'outgoing' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>{outgoingBoxes.length}</span>
            </button>

            <div className="ml-auto">
              <RefreshControl onRefresh={fetchBoxes} refreshing={loadingBoxes} lastUpdated={lastInventoryUpdate} storageKey="inventory" className="hidden sm:flex" />
            </div>
          </div>

          {/* Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰ */}
          {/* TAB: INCOMING BOXES                                              */}
          {/* Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰ */}
          {inventoryTab === 'incoming' && (
            <div className="flex-1 flex flex-col">
              {loadingBoxes ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Loading boxes...</p>
                </div>
              ) : incomingBoxes.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                  <Inbox className="h-10 w-10 mb-3 text-primary" />
                  <p className="font-semibold text-foreground">No incoming boxes</p>
                  <p className="text-sm">Boxes sent by the warehouse will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="flex-1 overflow-y-auto pr-1">
                    <div className="flex flex-col gap-2 pb-2">
                      {incomingBoxes.map(box => {
                        const activeSession = box.box_sessions?.[0]
                        const bookCount = activeSession?.total_scanned ?? box.total_books_expected ?? 0
                        const isExpanded = expandedBox === box.id
                        const booksForBox = boxBooks[box.id] || []
                        const warehouseTime = box.box_sessions?.[0]?.warehouse_time_received
                        const created = warehouseTime ? new Date(warehouseTime) : (box.created_at ? new Date(box.created_at) : null)
                        return (
                          <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                            <div className="flex items-center px-4 py-3 gap-4">
                              <button
                                onClick={() => toggleBox(box.id)}
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleBox(box.id)}>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Sent from Warehouse</span>
                                </div>
                                <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || 'â€”'} Â· BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                              </div>
                              {created && (
                                <div className="shrink-0 hidden sm:block text-right mr-2">
                                  <p className="text-xs text-muted-foreground">
                                    {created.toLocaleDateString()}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/80">
                                    {created.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </p>
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReceiveBox(box) }}
                                disabled={receivingBox === box.id}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                              >
                                {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
                                {receivingBox === box.id ? 'Receivingâ€¦' : 'Receive Box'}
                              </button>
                            </div>

                            {/* Expanded book list */}
                            {isExpanded && (
                              <div className="border-t border-border bg-muted/30">
                                {loadingBooks === box.id ? (
                                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading booksâ€¦
                                  </div>
                                ) : booksForBox.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">No books found in this box.</div>
                                ) : (
                                  <div className="divide-y divide-border">
                                    <div className="grid grid-cols-[1fr_80px_120px] items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50">
                                      <span>ISBN / Title</span>
                                      <span>Type</span>
                                      <span>Status</span>
                                    </div>
                                    {booksForBox.map(book => (
                                      <div key={book.id} className="grid grid-cols-[1fr_80px_120px] items-center px-4 py-2.5 hover:bg-muted/40 transition-colors">
                                        <div className="min-w-0 pr-3">
                                          <p className="text-xs font-semibold text-foreground truncate">{book.isbn}</p>
                                          {book.title && <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>}
                                        </div>
                                        <span className={cn(
                                          'text-xs font-medium',
                                          (book.book_type || box.lot?.type)?.toLowerCase() === 'jaguar' ? 'text-green-600' : 'text-blue-600'
                                        )}>
                                          {(book.book_type || box.lot?.type) ? (book.book_type || box.lot?.type)!.charAt(0).toUpperCase() + (book.book_type || box.lot?.type)!.slice(1).toLowerCase() : 'â€”'}
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium w-fit ${
                                            book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                            {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                          </span>
                                          {book.scan_status === 'non_processable' && book.flag?.issue && book.flag.issue !== 'non-processable' && book.flag.issue !== 'non_processable' && (
                                            <span className="text-[9px] font-semibold text-red-500/80 leading-none capitalize">
                                              {book.flag.issue}
                                            </span>
                                          )}
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

          {/* Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰ */}
          {/* TAB: BOOK VERIFICATION                                           */}
          {/* Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰ */}
          {inventoryTab === 'verification' && (
            <div className="flex flex-col gap-3 min-h-0 flex-1">

              {/* Confirm complete modal */}
              {verifConfirmComplete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setVerifConfirmComplete(false)}>
                  <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="h-0.5 w-full bg-primary/80" />
                    <div className="p-6 overflow-y-auto">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                            <h3 className="text-base font-semibold text-foreground">Complete Verification</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Review the ISBNs before sending verified books into iLMS.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                            <ScanBarcode className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Scanned</p>
                            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifScannedBooks.length}</p>
                          </div>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
                            <CircleCheck className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Processable</p>
                            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifProcessableBooks.length}</p>
                          </div>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
                            <CircleX className="h-4 w-4 text-destructive" />
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Non-Processable</p>
                            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifBlockedBooks.length + verifMissingBooks.length}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                          <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Processable ISBNs</p>
                              <p className="text-[11px] text-muted-foreground">These are the only ISBNs that will be updated or edited in iLMS.</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase tracking-wide">Update in iLMS</span>
                          </div>
                          <div className="max-h-44 overflow-y-auto divide-y divide-border">
                            {verifProcessableBooks.length === 0 ? (
                              <div className="p-4 text-center text-xs text-muted-foreground">No processable books scanned.</div>
                            ) : (
                              verifProcessableBooks.map((book, idx) => (
                                <div key={`${book.id}-${idx}`} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                                  <span className="text-xs font-semibold w-24 shrink-0">{book.isbn}</span>
                                  <span className="text-[11px] truncate flex-1">{book.title}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    Processable
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                          <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Non-Processable and Missing ISBNs</p>
                              <p className="text-[11px] text-muted-foreground">These are the ISBNs that can't be updated or edited in iLMS.</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold uppercase tracking-wide">Blocked from iLMS</span>
                          </div>
                          <div className="max-h-44 overflow-y-auto divide-y divide-border">
                            {verifBlockedBooks.length === 0 && verifMissingBooks.length === 0 ? (
                              <div className="p-4 text-center text-xs text-muted-foreground">No non-processable or missing books.</div>
                            ) : (
                              [
                                ...verifBlockedBooks.map(book => ({
                                  id: book.id,
                                  isbn: book.isbn,
                                  title: book.title,
                                  statusLabel: 'Non-Processable',
                                  statusClass: 'bg-red-100 text-red-700 border border-red-200',
                                })),
                                ...verifMissingBooks.map((book, idx) => ({
                                  id: `missing-${book.isbn}-${idx}`,
                                  isbn: book.isbn,
                                  title: book.title || 'Missing book',
                                  statusLabel: 'Missing',
                                  statusClass: 'bg-slate-100 text-slate-700 border border-slate-200',
                                })),
                              ].map((book, idx) => (
                                <div key={`${book.id}-${idx}`} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                                  <span className="text-xs font-semibold w-24 shrink-0">{book.isbn}</span>
                                  <span className="text-[11px] truncate flex-1">{book.title}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${book.statusClass}`}>
                                    {book.statusLabel}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground">* Total {verifScannedBooks.length} scanned books will be saved to the database when you confirm.</p>
                      </div>

                      <div className="flex gap-2 justify-end pt-5 mt-5 border-t border-border">
                        <button onClick={() => {
                          setVerifConfirmComplete(false)
                          setVerifTotalBooksExpected('')
                          setVerifIssueIsbn('')
                          setVerifIssues([])
                        }} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                        <button onClick={handleCompleteVerifSession} disabled={loadingVerifBooks} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50">
                          {loadingVerifBooks ? 'Completingâ€¦' : 'Confirm Complete'}
                        </button>
                      </div>
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
                      <button onClick={() => setVerifFlagModalBook(null)} className="text-muted-foreground hover:text-foreground">âœ•</button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{verifFlagModalBook.isbn} â€” {verifFlagModalBook.title}</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Issue</label>
                        <select value={verifFlagIssue} onChange={e => setVerifFlagIssue(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">Select issueâ€¦</option>
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
                        {verifFlagSaving ? 'Savingâ€¦' : verifFlagModalBook.scan_status === 'non_processable' ? 'Save Changes' : 'Confirm Flag'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!verifSessionActive ? (
                /* â”€â”€ Box list for verification â”€â”€ */
                <div className="flex-1 flex flex-col">
                  {loadingBoxes ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm font-medium">Loading boxes...</p>
                    </div>
                  ) : inventoryBoxes.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                      <ClipboardCheck className="h-10 w-10 mb-3 text-primary" />
                      <p className="font-semibold text-foreground">No boxes to verify</p>
                      <p className="text-sm">Receive boxes from the Incoming Boxes tab first.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col min-h-0 flex-1">
                      <div className="flex-1 overflow-y-auto pr-1">
                        <div className="flex flex-col gap-2 pb-2">
                          {inventoryBoxes.map(box => {
                            const isExpanded = verifExpandedBoxId === box.id
                            const rowBooks = verifRowBooks[box.id] || []
                            const isLoadingBooks = loadingVerifRowBooks === box.id
                            const activeSession = box.box_sessions?.[0]
                            const bookCount = activeSession?.total_scanned ?? box.total_books_expected ?? 0
                            const warehouseTime = box.box_sessions?.[0]?.inventory_time_received
                            const created = warehouseTime ? new Date(warehouseTime) : (box.created_at ? new Date(box.created_at) : null)
                            
                            return (
                              <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden">
                                {/* Row header â€” same style as Incoming Boxes */}
                                <div className="flex items-center px-4 py-3 gap-4">
                                  {/* Expand chevron */}
                                  <button
                                    onClick={() => toggleVerifRow(box.id)}
                                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  {/* Icon */}
                                  <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                                    <Package className="h-5 w-5 text-primary" />
                                  </div>
                                  {/* Info â€” clickable to expand */}
                                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleVerifRow(box.id)}>
                                    <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                    <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || 'â€”'} Â· BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                                  </div>
                                  {/* Date + time */}
                                  {created && (
                                    <div className="shrink-0 hidden sm:block text-right mr-2">
                                      <p className="text-xs text-muted-foreground">
                                        {created.toLocaleDateString()}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground/80">
                                        {created.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  )}
                                  {/* Start Session button */}
                                  <button
                                    onClick={() => handleStartVerifSession(box.id)}
                                    disabled={loadingVerifBooks}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                                  >
                                    {loadingVerifBooks
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <ClipboardList className="h-4 w-4" />}
                                    {loadingVerifBooks ? 'Startingâ€¦' : 'Start Session'}
                                  </button>
                                </div>
                                {/* Expandable books list */}
                                {isExpanded && (
                                  <div className="border-t border-border bg-muted/30">
                                    {isLoadingBooks ? (
                                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading booksâ€¦
                                      </div>
                                    ) : rowBooks.length === 0 ? (
                                      <div className="py-6 text-center text-sm text-muted-foreground">No books found in this box.</div>
                                    ) : (
                                      <div className="divide-y divide-border">
                                        <div className="grid grid-cols-[1fr_80px_120px] items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50">
                                          <span>ISBN / Title</span>
                                          <span>Type</span>
                                          <span>Status</span>
                                        </div>
                                        {rowBooks.map(book => (
                                          <div key={book.id} className="grid grid-cols-[1fr_80px_120px] items-center px-4 py-2.5 hover:bg-muted/40 transition-colors">
                                            <div className="min-w-0 pr-3">
                                              <p className="text-xs font-semibold text-foreground truncate">{book.isbn}</p>
                                              {book.title && <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>}
                                            </div>
                                            <span className={cn(
                                              'text-xs font-medium',
                                              (book.book_type || box.lot?.type)?.toLowerCase() === 'jaguar' ? 'text-green-600' : 'text-blue-600'
                                            )}>
                                              {(book.book_type || box.lot?.type) ? (book.book_type || box.lot?.type)!.charAt(0).toUpperCase() + (book.book_type || box.lot?.type)!.slice(1).toLowerCase() : 'â€”'}
                                            </span>
                                            <div className="flex flex-col gap-0.5">
                                              <span className={`text-[10px] px-2 py-0.5 rounded font-medium w-fit ${
                                                book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                              }`}>
                                                {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                              </span>
                                              {book.scan_status === 'non_processable' && book.flag?.issue && book.flag.issue !== 'non-processable' && book.flag.issue !== 'non_processable' && (
                                                <span className="text-[9px] font-semibold text-red-500/80 leading-none capitalize">
                                                  {book.flag.issue}
                                                </span>
                                              )}
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
              ) : verifBox && (
                <>
                  {/* â”€â”€ Active session bar â”€â”€ */}
                  <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4">
                    <div className="flex items-center gap-4">
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Active Lot</p>
                        <p className="text-sm font-semibold text-foreground">{verifBox.lot?.lot_number || 'â€”'}</p>
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
                          verifScannedBooks.length !== warehouseBooks.filter(wb => wb.rejection_reason !== 'missing').length ||
                          !warehouseBooks.filter(wb => wb.rejection_reason !== 'missing').every(wb => verifScannedBooks.some(vb => vb.isbn === wb.isbn))
                        }
                        className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Complete Session
                      </button>
                    </div>
                  </div>

                  {/* â”€â”€ Book count stats â”€â”€ */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                        <ScanBarcode className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Scanned</p>
                        <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifScannedBooks.length}</p>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
                        <CircleCheck className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Processable</p>
                        <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifProcessableBooks.length}</p>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
                        <CircleX className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Non-Processable</p>
                        <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{verifBlockedBooks.length + verifMissingBooks.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* â”€â”€ Scanner â”€â”€ */}
                  <ScannerInput onScan={handleVerifScan} />

                  {/* â”€â”€ Side-by-Side Warehouse and Inventory Tables â”€â”€ */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Warehouse Table (Left) - Read Only */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-primary">Warehouse Scans</h3>
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
                            <div className="col-span-6">Book Title</div>
                            <div className="col-span-3 text-right">Status</div>
                            <div className="col-span-1"></div>
                          </div>
                          <div className="space-y-1.5">
                            {warehouseBooks
                              .map((book) => {
                                const inventoryBook = verifScannedBooks.find(ib => ib.isbn === book.isbn)
                                const isMissing = book.rejection_reason === 'missing'
                                const isMatch = isMissing || (inventoryBook && inventoryBook.scan_status === book.scan_status)
                                return { book, isMatch, isMissing }
                              })
                              .sort((a, b) => {
                                if (a.isMissing && !b.isMissing) return 1;
                                if (!a.isMissing && b.isMissing) return -1;
                                return (a.isMatch === b.isMatch ? 0 : a.isMatch ? -1 : 1)
                              })
                              .map(({ book, isMatch, isMissing }, i) => (
                                <div key={i} className={cn("grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center",
                                  isMissing ? 'bg-gray-100 border-gray-300 opacity-60' : isMatch ? 'bg-primary/20 border-primary/40' : 'bg-red-100 border-red-300'
                                )}>
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
                                    </span  >
                                  </div>
                                  <div className="col-span-1"></div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inventory Table (Right) - Editable */}
                    <div className="bg-card border-2 border-primary rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold text-primary">Inventory Scans</h3>
                          <span className="text-xs text-muted-foreground">({verifScannedBooks.length} books)</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-primary/20 text-primary border-primary/30">
                          Currently Verifying
                        </span>
                      </div>
                      
                      {verifScannedBooks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No books scanned yet.</p>
                      ) : (
                        <div className="overflow-y-auto max-h-96">
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                            <div className="col-span-2">ISBN</div>
                            <div className="col-span-6">Book Title</div>
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
                                <div key={`${book.id}-${i}`} className={cn("grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center",
                                  isMatch ? 'bg-primary/20 border-primary/40' : 'bg-red-100 border-red-300'
                                )}>
                                  <div className="col-span-2">
                                    <p className="text-xs font-mono text-muted-foreground">{book.isbn}</p>
                                  </div>
                                  <div className="col-span-6">
                                    <p className="text-[11px] text-foreground truncate">{book.title}</p>
                                    {book.flag_issue && (
                                      <p className="text-[10px] text-red-600 mt-0.5">{issueLabel(book.flag_issue)}{book.flag_remarks ? ` â€” ${book.flag_remarks}` : ''}</p>
                                    )}
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
                        <span className="text-muted-foreground">Mismatch (Different status)</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                        <span className="text-muted-foreground">Missing (Not Required)</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰ */}
          {/* TAB: OUTGOING BOXES                                              */}
          {/* Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰Î“Ã²Ã‰ */}
          {inventoryTab === 'outgoing' && (
            <div className="flex-1 flex flex-col">
              {loadingBoxes ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Loading boxes...</p>
                </div>
              ) : outgoingBoxes.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                  <Send className="h-10 w-10 mb-3 text-primary" />
                  <p className="font-semibold text-foreground">No outgoing boxes yet</p>
                  <p className="text-sm">Complete a verification session in the Book Verification tab to add boxes here.</p>
                </div>
              ) : (
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="flex-1 overflow-y-auto pr-1">
                    <div className="flex flex-col gap-2 pb-2">
                      {outgoingBoxes.map(box => {
                        const activeSession = box.box_sessions?.[0]
                        const bookCount = activeSession?.total_scanned ?? box.total_books_expected ?? 0
                        const isExpanded = outgoingExpandedBoxId === box.id
                        const booksForBox: BookInBox[] = boxBooks[box.id] || []
                        const verifiedTime = box.latest_inventory_scan_at
                        const created = verifiedTime ? new Date(verifiedTime) : (box.created_at ? new Date(box.created_at) : null)
                        // All-printed gate: box label printed (book slips are optional)
                        const boxLabelPrinted = printedBoxLabels.has(box.id)
                        const slipsForBox = printedBookSlips[box.id] ?? new Set<string>()
                        const allPrinted = boxLabelPrinted
                        return (
                          <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden">
                            {/* â”€â”€ Header row â”€â”€ */}
                            <div className="flex items-center px-4 py-3 gap-4">
                              <button
                                onClick={() => toggleOutgoingBox(box)}
                                disabled={outgoingLoadingBooks === box.id}
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
                              >
                                {outgoingLoadingBooks === box.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>

                              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                                <Package className="h-5 w-5 text-primary" />
                              </div>

                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleOutgoingBox(box)}>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Verified</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  LOT: {box.lot?.lot_number || 'â€”'} Â· BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" />
                                </p>
                              </div>

                              {created && (
                                <div className="shrink-0 hidden sm:block text-right mr-2">
                                  <p className="text-xs text-muted-foreground">
                                    {created.toLocaleDateString()}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/80">
                                    {created.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </p>
                                </div>
                              )}

                              {/* Print label button + printed checkbox */}
                              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevents the row from collapsing/expanding
                                    handlePrintLabel(box);
                                  }}
                                  disabled={loadingPrint === box.id}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
                                >
                                  {loadingPrint === box.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Printer className="h-4 w-4" />
                                  )}
                                  {loadingPrint === box.id ? 'Loadingâ€¦' : 'Print Label'}
                                </button>
                                <input
                                  type="checkbox"
                                  checked={boxLabelPrinted}
                                  readOnly
                                  className="h-4 w-4 rounded border-border accent-primary cursor-default"
                                  title={boxLabelPrinted ? 'Label printed' : 'Label not yet printed'}
                                />
                              </div>

                              {/* Send button â€” only enabled once all book slips + box label are printed */}
                              <div className="shrink-0 relative group" onClick={e => e.stopPropagation()}>
                                {/* Invisible hover capture layer â€” ensures hover works even when button is disabled */}
                                {!allPrinted && <span className="absolute inset-0 z-10 cursor-not-allowed" />}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSendToCut(box)
                                  }}
                                  disabled={sendingToCut === box.id || !allPrinted}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  {sendingToCut === box.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                  {sendingToCut === box.id ? 'Sendingâ€¦' : 'Send to Cut'}
                                </button>
                                {!allPrinted && (
                                  <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10 pointer-events-none">
                                    <div className="bg-popover border border-border text-foreground text-[11px] rounded-md px-2.5 py-1.5 shadow-md whitespace-nowrap">
                                      Print the box label first
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* â”€â”€ Expanded book list â”€â”€ */}
                            {isExpanded && (
                              <div className="border-t border-border bg-muted/30">
                                {outgoingLoadingBooks === box.id ? (
                                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading booksâ€¦
                                  </div>
                                ) : booksForBox.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">No books found in this box.</div>
                                ) : (
                                  <div className="divide-y divide-border">
                                    {/* Column header */}
                                    <div className="grid grid-cols-[1fr_80px_120px_48px_40px] items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50">
                                      <span>ISBN / Title</span>
                                      <span>Type</span>
                                      <span>Status</span>
                                      <span className="text-center">Print</span>
                                      <span>{/* Printed â€” no header text */}</span>
                                    </div>
                                    {booksForBox.map(book => {
                                      const isBookPrinted = (printedBookSlips[box.id] ?? new Set<string>()).has(book.id)
                                      return (
                                      <div key={book.id} className="grid grid-cols-[1fr_80px_120px_48px_40px] items-center px-4 py-2.5 hover:bg-muted/40 transition-colors">
                                        {/* ISBN + title */}
                                        <div className="min-w-0 pr-3">
                                          <p className="text-xs font-semibold text-foreground truncate">{book.isbn}</p>
                                          {book.title && <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>}
                                        </div>
                                        {/* Book type â€” plain text */}
                                        <span className={cn(
                                          'text-xs font-medium',
                                          (book.book_type || box.lot?.type)?.toLowerCase() === 'jaguar'
                                            ? 'text-green-600'
                                            : 'text-blue-600'
                                        )}>
                                          {(book.book_type || box.lot?.type)
                                            ? (book.book_type || box.lot?.type)!.charAt(0).toUpperCase() + (book.book_type || box.lot?.type)!.slice(1).toLowerCase()
                                            : 'â€”'}
                                        </span>
                                        {/* Status badge */}
                                        <div className="flex flex-col gap-0.5">
                                          <span className={cn(
                                            'text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap w-fit',
                                            book.scan_status === 'processable'
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-red-100 text-red-700'
                                          )}>
                                            {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                          </span>
                                          {book.scan_status === 'non_processable' && book.flag?.issue && book.flag.issue !== 'non-processable' && book.flag.issue !== 'non_processable' && (
                                            <span className="text-[9px] font-semibold text-red-500/80 leading-none capitalize">
                                              {book.flag.issue}
                                            </span>
                                          )}
                                        </div>
                                        {/* Per-book print button */}
                                        <div className="flex items-center justify-center">
                                          <button
                                            onClick={() => handlePrintBookSlip(book, box)}
                                            disabled={loadingBookPrint === `${box.id}-${book.id}`}
                                            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
                                            title="Print book slip"
                                          >
                                            {loadingBookPrint === `${box.id}-${book.id}`
                                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              : <Printer className="h-3.5 w-3.5" />}
                                          </button>
                                        </div>
                                        {/* Printed checkbox */}
                                        <div className="flex items-center justify-center">
                                          <input
                                            type="checkbox"
                                            checked={isBookPrinted}
                                            readOnly
                                            className="h-4 w-4 rounded border-border accent-primary cursor-default"
                                            title={isBookPrinted ? 'Slip printed' : 'Not yet printed'}
                                          />
                                        </div>
                                      </div>
                                      )
                                    })}
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
      
      {/* Simflex Check Modal */}
      {simflexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !simflexModal.loading && setSimflexModal(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Simflex Transmission Check
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{simflexModal.box.box_number} Â· {simflexModal.box.lot?.lot_number}</p>
              </div>
              {!simflexModal.loading && (
                <button onClick={() => setSimflexModal(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">âœ•</button>
              )}
            </div>

            {/* Loading */}
            {simflexModal.loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Checking Simflex for all ISBNs in this boxâ€¦</p>
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
                    : 'bg-primary/10 border-primary/30'
                }`}>
                  {simflexModal.result.autoAdvanced
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    : <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-sm font-semibold ${
                      simflexModal.result.autoAdvanced ? 'text-green-800' : 'text-primary'
                    }`}>
                      {simflexModal.result.message}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Total processable: <strong>{simflexModal.result.totalProcessable}</strong></span>
                      <span className="text-green-700">Completed: <strong>{simflexModal.result.completedCount}</strong></span>
                      {simflexModal.result.pendingCount > 0 && (
                        <span className="text-primary">Pending: <strong>{simflexModal.result.pendingCount}</strong></span>
                      )}
                    </div>
                    {simflexModal.result.autoAdvanced && (
                      <p className="text-xs text-green-700 mt-1 font-medium">Box stage updated: Scan â†’ Transmit â†’ Storage</p>
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
                          <td className="py-1.5 px-3 text-muted-foreground">{r.boxNumber || 'â€”'}</td>
                          <td className="py-1.5 px-3 text-muted-foreground max-w-[180px] truncate" title={r.latestStatus || ''}>
                            {r.latestStatus || <span className="italic">Not in Simflex</span>}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            {r.transmissionCompleted
                              ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                              : <XCircle className="h-4 w-4 text-primary mx-auto" />}
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
      </div>
    </div>
    </>
  )
}

