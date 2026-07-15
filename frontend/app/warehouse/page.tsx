'use client'

import { useEffect, useState, useRef } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { RefreshControl } from "@/components/refresh-control"
import { ScannerInput } from '@/components/scanner-input'
import { useToast } from '@/hooks/use-toast'
import { getValidAccessToken, fetchUserProfile } from '@/lib/auth-api'
import { AlertTriangle, Package, PackagePlus, PackageMinus, Trash2, Check, ChevronsUpDown, ScanBarcode, CircleCheck, CircleX, BookOpen, Activity, X, RefreshCw, Loader2, Warehouse } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'

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


interface ILMSBookData {
  Title?: string
  Author?: string
  LotNo?: string
  BoxNo?: string
  'Received-Status'?: string
  [key: string]: any
}

interface ScannedBook {
  id: string
  isbn: string
  title: string
  author: string
  scan_status: 'processable' | 'non_processable'
  flag_issue?: string
  flag_remarks?: string
  timestamp: Date
  ilmsData?: ILMSBookData | null
}

interface WarehouseSession {
  id: string
  status: string
  type?: string
  total_scanned: number
  total_processable: number
  total_non_processable: number
  box_id?: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

const isValidIsbn = (isbn: string): boolean => {
  const digits = isbn.replace(/[^0-9]/g, '')
  return digits.length === 10 || digits.length === 13
}

// Normalize lot names for comparison: Lot 1, lot-1, Lot-3(1) all become "lot1"
function normalizeLotNumber(lot: string): string {
  return lot
    .toLowerCase()
    .replace(/lot[\s-]+(\d+.*)/, 'lot$1')
    .replace(/lot(\d+.*)/, 'lot$1')
    .replace(/\s+/g, '')
    .trim()
}

function findSimilarLot(typedLot: string, existingLots: { lot_number: string }[]): string | null {
  const normalized = normalizeLotNumber(typedLot)
  if (!normalized) return null
  for (const l of existingLots) {
    if (normalizeLotNumber(l.lot_number) === normalized) {
      return l.lot_number
    }
  }
  return null
}

export default function WarehousePage() {
  const { brand } = useBrand()
  const [activeLot, setActiveLot] = useState<string>('')
  const [lots, setLots] = useState<{ lot_number: string; type?: string; boxes: string[] }[]>([])
  const [lotsLoading, setLotsLoading] = useState(false)
  const [lotsError, setLotsError] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [selectedBox, setSelectedBox] = useState<string>('')
  const [sessionActive, setSessionActive] = useState(false)
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([])
  const [currentSession, setCurrentSession] = useState<WarehouseSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [isbnLoading, setIsbnLoading] = useState(false)
  const [currentBoxNumber, setCurrentBoxNumber] = useState('')
  const [currentBoxBooks, setCurrentBoxBooks] = useState(0)
  const [bookCounter, setBookCounter] = useState(0)
  const [userName, setUserName] = useState<string>('')
  // SSE connection ref for ISBN lookups
  const sseRef = useRef<EventSource | null>(null)
  // Flag modal state
  const [flagModalBook, setFlagModalBook] = useState<ScannedBook | null>(null)
  const [flagIssue, setFlagIssue] = useState('')
  const [flagRemarks, setFlagRemarks] = useState('')
  const [flagSaving, setFlagSaving] = useState(false)
  const [flagSearch, setFlagSearch] = useState('')
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  // Complete session modal state
  const [totalBooksExpected, setTotalBooksExpected] = useState('')
  const [issueIsbn, setIssueIsbn] = useState('')
  const [issueType, setIssueType] = useState<'missing' | 'extra'>('missing')
  const [issues, setIssues] = useState<Array<{ isbn: string; type: 'missing' | 'extra'; title?: string; author?: string }>>([])
  const [fetchingIssueBook, setFetchingIssueBook] = useState(false)
  const [conflictModalState, setConflictModalState] = useState<{
    open: boolean,
    type: 'zero_books' | 'has_books' | null,
    message: string,
    boxInfo?: any
  }>({ open: false, type: null, message: '' })
  const [similarLotModal, setSimilarLotModal] = useState<{
    open: boolean,
    typedLot: string,
    matchedLot: string,
    onContinue: () => void
  }>({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} })

  // Combobox states
  const [lotOpen, setLotOpen] = useState(false)
  const [boxOpen, setBoxOpen] = useState(false)
  const [flagOpen, setFlagOpen] = useState(false)

  // Tracking background refresh metrics
  const [refreshingStats, setRefreshingStats] = useState(false)
  const [lastStatsUpdate, setLastStatsUpdate] = useState<Date | null>(null)

  const { toast } = useToast()

  const currentSessionRef = useRef<WarehouseSession | null>(null)
  const sessionActiveRef = useRef(false)
  const boxInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    currentSessionRef.current = currentSession
    sessionActiveRef.current = sessionActive
  }, [currentSession, sessionActive])

  // Open SSE connection when a session starts, close when it ends
  useEffect(() => {
    if (sessionActive) {
      const token = localStorage.getItem('access_token')
      if (!token) return
      const es = new EventSource(`${API_URL}/api/warehouse/isbn-stream?token=${encodeURIComponent(token)}`)
      es.addEventListener('connected', () => console.log('📡 ISBN stream connected'))
      es.onerror = () => console.warn('ISBN stream error — will retry automatically')
      sseRef.current = es
      return () => { es.close(); sseRef.current = null }
    } else {
      sseRef.current?.close()
      sseRef.current = null
    }
  }, [sessionActive])

  // Handle page refresh/exit and component unmount
  useEffect(() => {
    const cleanupSession = () => {
      if (sessionActiveRef.current && currentSessionRef.current && currentSessionRef.current.id !== 'pending') {
        const token = localStorage.getItem('access_token')
        if (token) {
          // Use keepalive: true to ensure the request is completed even if the page unloads
          fetch(`${API_URL}/api/warehouse/sessions/${currentSessionRef.current.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
            keepalive: true
          }).catch(console.error)
        }
      }
    }

    // Runs when the user closes the tab or refreshes the page
    window.addEventListener('beforeunload', cleanupSession)
    
    return () => {
      window.removeEventListener('beforeunload', cleanupSession)
      // Runs when the user navigates away to another page within the app
      cleanupSession()
    }
  }, [])

  // Fetch user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      const profile = await fetchUserProfile()
      if (profile && profile.name) {
        setUserName(profile.name)
      }
    }
    loadUserProfile()
  }, [])

  const loadLots = async () => {
    setLotsLoading(true)
    setLotsError(null)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(`${API_URL}/api/warehouse/ilms-lots`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setLots(data.lots || [])
      } else {
        setLotsError('Failed to load lots from iLMS.')
      }
    } catch (err: any) {
      setLotsError(err.message || 'Failed to connect to iLMS.')
    } finally {
      setLotsLoading(false)
    }
  }

  const handleRefreshStats = async () => {
    setRefreshingStats(true)
    try {
      await loadLots()
      setLastStatsUpdate(new Date())
      toast({ title: 'Lots Refreshed', description: 'Warehouse lot list synchronized successfully.' })
    } catch {
      setSessionError('Failed to refresh lots.')
    } finally {
      setRefreshingStats(false)
    }
  }

  // Fetch all active (non-received) lots + boxes from iLMS on mount
  useEffect(() => {
    loadLots()
  }, [])

  // Boxes for the currently selected lot
  const availableBoxes = lots.find(l => l.lot_number === activeLot)?.boxes ?? []

  const handleNewSession = async (force: boolean = false, skipSimilarLotCheck: boolean = false) => {
    setSessionError(null)
    setLoading(true)
    let formattedLot = activeLot.trim()

    if (!formattedLot) { setSessionError('Please select a lot first'); setLoading(false); return }

    if (!skipSimilarLotCheck) {
      const matchedLot = findSimilarLot(formattedLot, lots)
      if (matchedLot && matchedLot !== formattedLot) {
        setLoading(false)
        setSimilarLotModal({
          open: true,
          typedLot: formattedLot,
          matchedLot,
          onContinue: () => handleNewSession(force, true)
        })
        return
      }
    }

    if (!formattedLot.toLowerCase().startsWith('lot')) {
      setSessionError("The Lot Number must start with the word 'Lot' (e.g. Lot-109).")
      setLoading(false)
      return
    }
    if (!selectedBox) { setSessionError('Please select a box first'); setLoading(false); return }
    if (!selectedBox.includes('/')) {
      setSessionError("The Box Number must contain a '/' (e.g. 181/264).")
      setLoading(false)
      return
    }
    
    const [currentBox, totalBoxes] = selectedBox.split('/')
    const currentNum = parseInt(currentBox, 10)
    const totalNum = parseInt(totalBoxes, 10)

    if (isNaN(currentNum) || isNaN(totalNum) || currentNum > totalNum) {
      setSessionError('The total boxes (right side) must be greater than or equal to the current box (left side). Example: 12/400.')
      setLoading(false)
      return
    }

    // Prevent duplicate box numbers within the same lot
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const params = new URLSearchParams({ lot_number: formattedLot, box_number: selectedBox, type: brand })
      const checkRes = await fetch(`${API_URL}/api/warehouse/box-exists?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const checkData = await checkRes.json()
      if (checkRes.ok && checkData.exists) {
        setSessionError(`Box ${selectedBox} already exists in ${formattedLot.toLowerCase().startsWith('lot') ? formattedLot : `Lot ${formattedLot}`}. Please use a different box number.`)
        setLoading(false)
        return
      }
    } catch (err: any) {
      setSessionError(err.message || 'Failed to verify box number.')
      setLoading(false)
      return
    }

    // Bypass Backend: Set up local session only
    // The database Lot and Box will only be created when they actually Complete the session!
    setCurrentSession({ 
      id: `pending-${Date.now()}`,
      status: 'completed',
      type: brand, // Store the brand active when session was started
      total_scanned: 0,
      total_processable: 0, 
      total_non_processable: 0 
    })
    setSessionActive(true)
    setScannedBooks([])
    setBookCounter(0)
    setCurrentBoxNumber(selectedBox)
    setCurrentBoxBooks(0)
    setLoading(false)
    toast({ title: 'Session Started', description: `Local session created. Lot will be saved to database upon completion.` })
  }

  const handleCloseSession = async () => {
    if (!currentSession) return
    if (scannedBooks.length === 0) {
      setSessionError('Please scan at least one book before completing the session.')
      return
    }
    // Reset modal state
    setTotalBooksExpected('')
    setIssueIsbn('')
    setIssueType('missing')
    setIssues([])
    setConfirmCompleteOpen(true)
  }

  const confirmCloseSession = async (skipSimilarLotCheck: boolean = false) => {
    if (!currentSession) return
    if (loading) return

    if (!skipSimilarLotCheck) {
      const matchedLot = findSimilarLot(activeLot, lots)
      if (matchedLot && matchedLot !== activeLot) {
        setSimilarLotModal({
          open: true,
          typedLot: activeLot,
          matchedLot,
          onContinue: () => confirmCloseSession(true)
        })
        return
      }
    }

    if (!totalBooksExpected.trim()) {
      setSessionError('Please enter the total books expected.')
      return
    }

    const expected = parseInt(totalBooksExpected)
    if (isNaN(expected)) {
      setSessionError('Total books expected must be a valid number.')
      return
    }

    const missingCount = issues.filter(i => i.type === 'missing').length
    // Extra books are unaccounted and don't reduce the expected total.
    const calculatedExpected = scannedBooks.length + missingCount

    if (expected !== calculatedExpected) {
      setSessionError(`Total expected books (${expected}) does not match total scanned (${scannedBooks.length}) + missing (${missingCount}) books.`)
      return
    }

    setConfirmCompleteOpen(false)
    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')

      // 1. Single Bulk Request
      const bulkRes = await fetch(`${API_URL}/api/warehouse/sessions/bulk-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          lot_number: activeLot,
          box_number: currentBoxNumber,
          type: currentSession.type,
          force: true,
          total_books_expected: parseInt(totalBooksExpected) || 0,
          issues: issues,
          scanned_books: scannedBooks,
          book_type: brand
        })
      })
      const bulkData = await bulkRes.json()
      if (!bulkRes.ok) throw new Error(bulkData.error || 'Failed to bulk save session')
      
      setSessionActive(false); setScannedBooks([]); setBookCounter(0); setCurrentSession(null); setSelectedBox(''); setCurrentBoxNumber(''); setCurrentBoxBooks(0); setActiveLot('');
      setTotalBooksExpected('')
      setIssueIsbn('')
      setIssues([])
      toast({ title: 'Session Closed', description: 'Session closed successfully.' })
    } catch (error: any) { 
      setSessionError(error.message || 'Failed to complete session') 
    } finally { 
      setLoading(false) 
    }
  }

  const handleResetSession = () => {
    if (!currentSession) return
    setConfirmResetOpen(true)
  }

  const confirmResetSession = async () => {
    if (!currentSession) return
    setConfirmResetOpen(false)
    
    try {
      if (!currentSession.id.startsWith('pending')) {
        const token = await getValidAccessToken()
        if (token) {
          await fetch(`${API_URL}/api/warehouse/sessions/${currentSession.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          })
        }
      }
    } catch (e) {
      console.error('Failed to delete session', e)
    }

    // Clear local state
    setSessionActive(false)
    setScannedBooks([])
    setBookCounter(0)
    setCurrentSession(null)
    setSelectedBox('')
    setCurrentBoxNumber('')
    setCurrentBoxBooks(0)
    setActiveLot('')
    toast({ title: 'Session Cancelled', description: 'Session has been cancelled and removed from the database.' })
  }

  const handleAddIssue = async () => {
    const cleanIsbn = issueIsbn.trim().replace(/[^0-9]/g, '')
    if (!cleanIsbn) return

    if (!isValidIsbn(cleanIsbn)) {
      setSessionError('Input is not a valid ISBN (must be 10 or 13 digits).')
      setIssueIsbn('')
      return
    }

    if (scannedBooks.some(b => b.isbn === cleanIsbn)) {
      setSessionError(`You already scanned ISBN ${cleanIsbn} in your scan log. Remove it first if you want to re-add it as missing/extra.`)
      setIssueIsbn('')
      return
    }
    
    if (issues.some(i => i.isbn === cleanIsbn)) {
      setSessionError(`ISBN ${cleanIsbn} is already listed as a missing/extra issue.`)
      setIssueIsbn('')
      return
    }

    setFetchingIssueBook(true)
    setSessionError(null)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')

      const response = await fetch(`${API_URL}/api/warehouse/isbn-stream/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isbn: cleanIsbn, type: currentSession?.type, allowExisting: true })
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setSessionError(data.error || `ISBN ${cleanIsbn} not found in ${currentSession?.type?.toUpperCase() || 'iLMS'} records.`)
        setIssueIsbn('')
        return
      }

      const issueData = {
        isbn: cleanIsbn,
        type: issueType,
        title: data.data?.Title || 'Unknown Title',
        author: data.data?.Author || 'Unknown Author'
      }
      setIssues(prev => [...prev, issueData])
      setIssueIsbn('')
    } catch {
      setSessionError('Failed to connect to iLMS. Please try again.')
    } finally {
      setFetchingIssueBook(false)
    }
  }

  const handleRemoveIssue = (isbn: string) => {
    setIssues(prev => prev.filter(issue => issue.isbn !== isbn))
  }

  const handleIssueKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && issueIsbn.trim()) {
      handleAddIssue()
    }
  }

  const handleScan = async (isbn: string) => {
    if (!currentSession) return
    
    setSessionError(null)
    
    const cleanIsbn = isbn.replace(/[^0-9]/g, '')
    if (!isValidIsbn(cleanIsbn)) {
      setSessionError('Scanned code is not a valid ISBN (must be 10 or 13 digits).')
      return
    }

    // Prevent duplicate ISBN entries within the same session
    if (scannedBooks.some(b => b.isbn === cleanIsbn)) {
      setSessionError(`ISBN ${cleanIsbn} is already in your scan log. You cannot scan the same book twice before completing the session.`)
      return
    }

    setIsbnLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')

      // Use the SSE query endpoint — lightweight POST that returns iLMS data
      const ilmsRes = await fetch(`${API_URL}/api/warehouse/isbn-stream/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isbn: cleanIsbn, type: currentSession.type })
      })
      const ilmsData = await ilmsRes.json()

      if (!ilmsData.success) {
        setSessionError(ilmsData.error || `ISBN ${cleanIsbn} not found in ${currentSession.type?.toUpperCase() || 'iLMS'} records.`)
        return
      }

      const bookData = ilmsData.data as ILMSBookData
      saveBookToLocal(
        { isbn: cleanIsbn, title: bookData?.Title || 'Unknown Title', author: bookData?.Author || 'Unknown Author', ilmsData: bookData },
        'processable', null, null
      )
    } catch (error) {
      setSessionError('Failed to verify ISBN. Please try again.')
    } finally { setIsbnLoading(false) }
  }

  const saveBookToLocal = (bookData: any, scan_status: 'processable' | 'non_processable', flag_issue: string | null, flag_remarks: string | null) => {
    if (!currentSession || !bookData) return
    // Increment book count for the selected box
    setCurrentBoxBooks(prev => prev + 1)
    setBookCounter(prev => prev + 1)
    const newBook: ScannedBook = {
      id: `local-${Date.now()}`, // Temporary ID
      isbn: bookData.isbn,
      ilmsData: bookData.ilmsData || null,
      title: bookData.title,
      author: bookData.author,
      scan_status,
      flag_issue: flag_issue || undefined,
      flag_remarks: flag_remarks || undefined,
      timestamp: new Date()
    }
    setScannedBooks(prev => [newBook, ...prev])
    setCurrentSession(prev => prev ? {
      ...prev,
      total_scanned: prev.total_scanned + 1,
      total_processable: scan_status === 'processable' ? prev.total_processable + 1 : prev.total_processable,
      total_non_processable: scan_status === 'non_processable' ? prev.total_non_processable + 1 : prev.total_non_processable,
    } : null)
  }


  const openFlagModal = (book: ScannedBook) => {
    setFlagModalBook(book)
    setFlagIssue(book.flag_issue || '')
    setFlagRemarks(book.flag_remarks || '')
    setFlagSearch('')
    setFlagOpen(false)
  }

  const saveFlagFromLog = async () => {
    if (!flagModalBook || !flagIssue) { setSessionError('Select an issue first'); return }
    setFlagSaving(true)
    try {
      // Update local state only (will be saved to DB on session completion)
      setScannedBooks(prev => prev.map(b => b.id === flagModalBook.id
        ? { ...b, scan_status: 'non_processable', flag_issue: flagIssue, flag_remarks: flagRemarks }
        : b
      ))
      setCurrentSession(prev => prev ? {
        ...prev,
        total_non_processable: prev.total_non_processable + 1,
        total_processable: Math.max(0, prev.total_processable - 1),
      } : null)
      setFlagModalBook(null)
      toast({ title: 'Flagged as Non-Processable' })
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : 'Failed to flag book')
    } finally { setFlagSaving(false) }
  }

  const handleRemoveBook = (bookId: string) => {
    const book = scannedBooks.find(b => b.id === bookId)
    if (!book) return
    setScannedBooks(prev => prev.filter(b => b.id !== bookId))
    setCurrentBoxBooks(prev => Math.max(0, prev - 1))
    setBookCounter(prev => Math.max(0, prev - 1))
    setCurrentSession(prev => prev ? {
      ...prev,
      total_scanned: Math.max(0, prev.total_scanned - 1),
      total_processable: book.scan_status === 'processable' ? Math.max(0, prev.total_processable - 1) : prev.total_processable,
      total_non_processable: book.scan_status === 'non_processable' ? Math.max(0, prev.total_non_processable - 1) : prev.total_non_processable,
    } : null)
    toast({ title: 'Book Removed', description: `${book.isbn} removed from scan log.` })
  }

  const issueLabel = (val: string) => FLAG_ISSUES.find(i => i.value === val)?.label || val

  const lastUpdateLabel = lastStatsUpdate
    ? `Updated ${lastStatsUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
    : 'Not updated yet'

  return (
    <div className={cn("flex h-dvh overflow-hidden bg-background", `theme-${brand}`)}>
      <DashboardSidebar navigationLocked={sessionActive} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar disableBrandToggle={sessionActive} navigationLocked={sessionActive} />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">

          {/* Confirm Complete Session Modal */}
          {confirmCompleteOpen && (
            <div className="fixed top-0 left-0 right-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-0 bg-black/50 backdrop-blur-sm overflow-y-auto" style={{ bottom: 0, minHeight: '100%' }} onClick={() => setConfirmCompleteOpen(false)}>
              <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col max-h-none sm:max-h-[90vh] overflow-hidden my-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                      <CircleCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Complete Session</h3>
                      <p className="text-xs text-muted-foreground">Finalize scan log and resolve discrepancies</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmCompleteOpen(false)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Scrollable Body — sections sit flush in the modal, no nested card */}
                <div className="overflow-y-auto flex-1">

                  {/* TOP SECTION: Total Books Expected */}
                  <div className="px-6 py-5 space-y-3 bg-blue-500/5 border-t border-blue-500/50">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                        <Package className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs font-bold text-foreground tracking-tight">Total Books Expected</label>
                          <span className="text-destructive font-bold text-xs">*</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">The actual physical count of books inside this box</p>
                      </div>
                    </div>

                    <input
                      type="number"
                      value={totalBooksExpected}
                      onChange={(e) => setTotalBooksExpected(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full max-w h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                    />
                  </div>

                  {/* BOTTOM SECTION: Discrepancies */}
                  <div className="px-6 py-5 space-y-4 bg-amber-500/5 border-t border-b border-amber-500/50">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/10">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-foreground tracking-tight">Discrepancies</label>
                        <p className="text-[11px] text-muted-foreground">Log any missing or extra books found in the physical box</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Type toggle */}
                      <div className="flex gap-1 p-1 bg-muted/80 rounded-lg w-fit">
                        <button
                          type="button"
                          onClick={() => setIssueType('missing')}
                          className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-colors ${
                            issueType === 'missing'
                              ? 'bg-red-500 text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <PackageMinus className="h-3.5 w-3.5" />
                          Missing
                        </button>
                        <button
                          type="button"
                          onClick={() => setIssueType('extra')}
                          className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-colors ${
                            issueType === 'extra'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          Extra
                        </button>
                      </div>

                      {/* Issue Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={issueIsbn}
                          onChange={(e) => setIssueIsbn(e.target.value.replace(/[^0-9]/g, ''))}
                          onKeyPress={handleIssueKeyPress}
                          placeholder={issueType === 'missing' ? "Input ISBN..." : "Scan or input ISBN..."}
                          className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                        />
                        <button
                          onClick={handleAddIssue}
                          disabled={!issueIsbn.trim() || fetchingIssueBook}
                          className={`px-4 h-10 rounded-lg font-semibold disabled:opacity-50 transition-colors text-xs shrink-0 shadow-sm ${
                            issueType === 'missing'
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                        >
                          {fetchingIssueBook ? 'Adding...' : 'Add Book'}
                        </button>
                      </div>

                      {/* Issues List */}
                      {issues.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            {issues.length} {issues.length === 1 ? 'issue' : 'issues'} logged
                          </p>
                          <div className="border border-border rounded-lg p-2 bg-background/50">
                            <div
                              className="space-y-1.5 max-h-48 overflow-y-auto pr-1
                                [&::-webkit-scrollbar]:w-1.5
                                [&::-webkit-scrollbar-track]:bg-transparent
                                [&::-webkit-scrollbar-thumb]:bg-amber-500/60
                                [&::-webkit-scrollbar-thumb]:rounded-full
                                [&::-webkit-scrollbar-thumb:hover]:bg-amber-500/80
                                [&::-webkit-scrollbar-button]:hidden
                                [&::-webkit-scrollbar-button]:h-0
                                [&::-webkit-scrollbar-button]:w-0"
                              style={{ scrollbarColor: 'rgba(245, 158, 11, 0.6) transparent', scrollbarWidth: 'thin' }}
                            >
                              {issues.map((issue, index) => (
                                <div
                                  key={index}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors shadow-sm ${
                                    issue.type === 'missing'
                                      ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                                      : 'bg-primary/5 border-primary/20 hover:border-primary/40'
                                  }`}
                                >
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                                    issue.type === 'missing' ? 'bg-red-500/10' : 'bg-primary/10'
                                  }`}>
                                    {issue.type === 'missing'
                                      ? <PackageMinus className="h-4 w-4 text-red-500" />
                                      : <PackagePlus className="h-4 w-4 text-primary" />}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="items-center gap-2">
                                      <span className="text-xs font-semibold text-foreground truncate">ISBN: {issue.isbn}</span>
                                      <p className="text-[13px] font-semibold text-foreground line-clamp-1 leading-tight">{issue.title || 'Unknown Title'}</p>
                                    </div>
                                  </div>

                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                                    issue.type === 'missing' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                                  }`}>
                                    {issue.type === 'missing' ? 'Missing' : 'Extra'}
                                  </span>

                                  <button
                                    onClick={() => handleRemoveIssue(issue.isbn)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer / Actions */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/10 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Stats summary */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div><span className="font-semibold text-foreground">{totalBooksExpected || 0}</span> Expected</div>
                    <div className="w-px h-3 bg-border" />
                    <div><span className="font-semibold text-foreground">{currentSession?.total_scanned || 0}</span> Scanned</div>
                    {issues.length > 0 && (
                      <>
                        <div className="w-px h-3 bg-border" />
                        <div><span className="font-semibold text-destructive">{issues.length}</span> Issues</div>
                      </>
                    )}
                  </div>
                  {/* Action buttons — full width on mobile, auto on desktop */}
                  <div className="flex gap-2 sm:shrink-0">
                    <button onClick={() => {
                      setConfirmCompleteOpen(false)
                      setTotalBooksExpected('')
                      setIssueIsbn('')
                      setIssues([])
                    }} className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={() => confirmCloseSession()} disabled={loading} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50 transition-colors shadow-sm">
                      <CircleCheck className="h-4 w-4" />
                      {loading ? 'Completing...' : 'Confirm Complete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reset Session Modal */}
          {confirmResetOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmResetOpen(false)}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Reset Session</h3>
                      <p className="text-[11px] text-muted-foreground">This action cannot be undone</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmResetOpen(false)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Body */}
                <div className="px-5 py-4">
                  <p className="text-sm text-muted-foreground">All scanned books in this session will be permanently discarded. The box will be removed and the lot count will be updated.</p>
                </div>
                {/* Actions */}
                <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
                  <button onClick={() => setConfirmResetOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={confirmResetSession} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                    Reset Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conflict Modal */}
          {conflictModalState.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConflictModalState({ open: false, type: null, message: '' })}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${conflictModalState.type === 'has_books' ? 'bg-destructive/10' : 'bg-amber-500/10'}`}>
                      <AlertTriangle className={`h-4 w-4 ${conflictModalState.type === 'has_books' ? 'text-destructive' : 'text-amber-500'}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {conflictModalState.type === 'has_books' ? 'Cannot Start Session' : 'Box Already Exists'}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">Action Required</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConflictModalState({ open: false, type: null, message: '' })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Body */}
                <div className="px-5 py-4">
                  <p className="text-sm text-muted-foreground">{conflictModalState.message}</p>
                </div>
                {/* Actions */}
                <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
                  {conflictModalState.type === 'zero_books' ? (
                    <>
                      <button onClick={() => setConflictModalState({ open: false, type: null, message: '' })} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                      <button onClick={() => { setConflictModalState({ open: false, type: null, message: '' }); handleNewSession(true) }} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors">Retry Again</button>
                    </>
                  ) : (
                    <button onClick={() => setConflictModalState({ open: false, type: null, message: '' })} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted font-medium transition-colors">Close</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Similar Lot Warning Modal */}
          {similarLotModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSimilarLotModal({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} })}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Similar Lot Found</h3>
                      <p className="text-[11px] text-muted-foreground">Check lot name</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSimilarLotModal({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} })}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{similarLotModal.typedLot}</span> is similar to the existing lot <span className="font-semibold text-foreground">{similarLotModal.matchedLot}</span>.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Is this the same lot? If so, use the existing name. If not, continue with the new name.
                  </p>
                </div>
                {/* Actions */}
                <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
                  <button
                    onClick={() => { setActiveLot(similarLotModal.matchedLot); setSimilarLotModal({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} }) }}
                    className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted font-medium transition-colors"
                  >
                    Use {similarLotModal.matchedLot}
                  </button>
                  <button
                    onClick={() => { setSimilarLotModal({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} }); similarLotModal.onContinue() }}
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Flag Modal */}
          {flagModalBook && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setFlagModalBook(null)}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Flag as Non-Processable</h3>
                      <p className="text-[11px] text-muted-foreground">Mark this book with a rejection reason</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFlagModalBook(null)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Book Info */}
                <div className="px-5 py-3 bg-muted/30 border-b border-border">
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{flagModalBook.title}</p>
                      <p className="text-sm font-bold tracking-wider text-foreground font-mono mt-1">ISBN: {flagModalBook.isbn}</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-2 block">Rejection Reason <span className="text-destructive">*</span></label>
                    <Popover open={flagOpen} onOpenChange={setFlagOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={flagOpen}
                          className="w-full justify-between font-normal text-sm h-9 hover:bg-muted/50 hover:text-foreground"
                        >
                          <span className={flagIssue ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
                            {flagIssue ? FLAG_ISSUES.find(i => i.value === flagIssue)?.label : 'Select rejection reason...'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                        <Command>
                          <CommandInput placeholder="Search issue..." />
                          <CommandList className="max-h-48">
                            <CommandEmpty>No issue found.</CommandEmpty>
                            <CommandGroup>
                              {FLAG_ISSUES.map(i => (
                                <CommandItem
                                  key={i.value}
                                  value={i.label}
                                  onSelect={() => { setFlagIssue(i.value); setFlagOpen(false) }}
                                  className="flex justify-between items-center w-full"
                                >
                                  <span>{i.label}</span>
                                  <Check className={cn('h-4 w-4 text-white', flagIssue === i.value ? 'opacity-100' : 'opacity-0')} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Remarks / Page No. <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={flagRemarks}
                      onChange={e => setFlagRemarks(e.target.value)}
                      placeholder="e.g. Page 42, bottom margin"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
                  <button
                    onClick={() => setFlagModalBook(null)}
                    className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFlagFromLog}
                    disabled={!flagIssue || flagSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium disabled:opacity-50 transition-colors"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {flagSaving ? 'Saving...' : 'Confirm Flag'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          {!sessionActive && (lotsLoading ? (
            <div className="flex items-center justify-end">
              <Skeleton className="h-9 w-28 bg-muted-foreground/20" />
            </div>
          ) : (
            <header className="flex items-center justify-end">
              <RefreshControl onRefresh={handleRefreshStats} refreshing={refreshingStats || lotsLoading} lastUpdated={lastStatsUpdate} storageKey="warehouse" className="hidden sm:flex" />
            </header>
          ))}

          {(sessionError || lotsError) && (
            <div className="fixed top-10 right-6 z-50 flex items-start gap-3 max-w-md px-5 py-4 rounded-xl bg-destructive text-destructive-foreground text-base font-semibold shadow-lg animate-in fade-in slide-in-from-right-4">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
              <span className="leading-snug flex-1">{sessionError || lotsError}</span>
              <button
                type="button"
                onClick={() => { setSessionError(null); setLotsError(null) }}
                className="p-1.5 rounded-md hover:bg-destructive-foreground/20 transition-colors"
                aria-label="Dismiss warning"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Session Control */}
          {!sessionActive ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 min-h-[500px]">

              {lotsLoading ? (
                <div className="flex flex-col items-center w-full max-w-2xl">
                  <div className="mb-8 text-center space-y-2">
                    <Skeleton className="h-8 w-56 bg-muted-foreground/20" />
                    <Skeleton className="h-4 w-72 bg-muted-foreground/20" />
                  </div>
                  <div className="bg-card border border-border shadow-xl shadow-black/5 rounded-2xl w-full overflow-hidden relative">
                    <Skeleton className="absolute top-0 left-0 right-0 h-1 rounded-none bg-muted-foreground/20" />
                    <div className="p-8 md:p-10 space-y-6">
                      <div className="flex items-center gap-5 mb-2">
                        <Skeleton className="w-14 h-14 rounded-2xl bg-muted-foreground/20" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-6 w-48 bg-muted-foreground/20" />
                          <Skeleton className="h-4 w-3/4 max-w-sm bg-muted-foreground/20" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-xl bg-muted/30 border border-border">
                        <div className="flex flex-col gap-2.5">
                          <Skeleton className="h-4 w-24 bg-muted-foreground/20" />
                          <Skeleton className="h-11 w-full rounded-lg bg-muted-foreground/20" />
                        </div>
                        <div className="flex flex-col gap-2.5">
                          <Skeleton className="h-4 w-24 bg-muted-foreground/20" />
                          <Skeleton className="h-11 w-full rounded-lg bg-muted-foreground/20" />
                        </div>
                      </div>
                      <Skeleton className="h-12 w-full rounded-lg bg-muted-foreground/20" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full max-w-2xl">
                  <div className="mb-8 text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Warehouse Receiving</h1>
                    <p className="text-sm text-muted-foreground">Select a lot and box to initialize a new scanning session</p>
                  </div>
                  <div className="bg-card border border-border shadow-xl shadow-black/5 rounded-2xl w-full overflow-hidden relative">
                    {/* Accent strip */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

                    {loading && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card">
                        <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border border-border rounded-xl shadow-lg">
                          <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <span className="text-sm font-semibold text-foreground">Starting session...</span>
                        </div>
                      </div>
                    )}

                    <div className="p-8 md:p-10">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 shrink-0">
                        <Package className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Start Receiving Session</h2>
                        <p className="text-sm text-muted-foreground mt-1.5">Select a lot and box to begin scanning books into inventory.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-xl bg-muted/30 border border-border">
                        {/* Lot Selector */}
                        <div className="flex flex-col gap-2.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                            Lot Number
                            {activeLot && !lotsLoading && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">SELECTED</span>}
                          </label>
                          <Popover open={lotOpen} onOpenChange={setLotOpen}>
                            <PopoverAnchor asChild>
                              <div className="relative">
                                <Input
                                  placeholder="Type or search lot..."
                                  value={activeLot}
                                  onChange={(e) => {
                                    setActiveLot(e.target.value);
                                    setLotOpen(true);
                                    setSessionError(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      setLotOpen(false);
                                      if (activeLot && selectedBox) {
                                        handleNewSession(false);
                                      } else {
                                        setTimeout(() => boxInputRef.current?.focus(), 0);
                                      }
                                    }
                                  }}
                                  onFocus={() => setLotOpen(true)}
                                  disabled={lotsLoading}
                                  className="h-11 pr-10 bg-background text-sm shadow-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                                />
                                <ChevronsUpDown className="absolute right-3 top-3.5 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                              </div>
                            </PopoverAnchor>
                            <PopoverContent className="w-[280px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                              <Command>
                                <CommandList>
                                  <CommandEmpty className="py-4 flex justify-center text-sm">
                                    {activeLot ? (
                                      <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-md font-medium text-xs tracking-wide">
                                        Use custom: {activeLot}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">No lot found.</span>
                                    )}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {lots
                                      .filter(l => l.type?.toLowerCase() === brand && String(l.lot_number).toLowerCase().includes(activeLot.toLowerCase()))
                                      .slice(0, 10)
                                      .map(l => (
                                      <CommandItem 
                                        key={l.lot_number} 
                                        value={String(l.lot_number)} 
                                        onSelect={(v) => { 
                                          setActiveLot(String(l.lot_number));
                                          setLotOpen(false); 
                                          setSessionError(null);
                                          setTimeout(() => boxInputRef.current?.focus(), 0);
                                        }} 
                                        className="flex justify-between items-center w-full py-2 cursor-pointer"
                                      >
                                        <span className="font-medium">{String(l.lot_number).toLowerCase().startsWith('lot') ? String(l.lot_number) : `Lot ${String(l.lot_number)}`}</span>
                                        <Check className={cn('h-4 w-4 text-primary ml-auto', activeLot === String(l.lot_number) ? 'opacity-100' : 'opacity-0')} />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Box Selector */}
                        <div className="flex flex-col gap-2.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                            Box Number
                            {selectedBox && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">SELECTED</span>}
                          </label>
                          <Input
                            ref={boxInputRef}
                            placeholder="e.g. 181/264"
                            value={selectedBox}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^[0-9/]*$/.test(val)) {
                                setSelectedBox(val);
                                setSessionError(null);
                              }
                            }}
                            disabled={!activeLot}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && activeLot && selectedBox) {
                                e.preventDefault();
                                handleNewSession(false);
                              }
                            }}
                            className="h-11 bg-background text-sm shadow-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                      
                      {activeLot && selectedBox && (
                        <div className="flex items-center justify-center gap-2.5 py-3 px-4 bg-primary/5 border border-primary/10 rounded-xl text-sm font-semibold text-primary animate-in fade-in zoom-in-95 duration-200">
                          <Package className="h-4 w-4 opacity-70" />
                          <span>{activeLot.toLowerCase().startsWith('lot') ? activeLot : `Lot ${activeLot}`}</span>
                          <span className="text-primary/30">•</span>
                          <span>Box {selectedBox}</span>
                        </div>
                      )}

                      <Button
                        onClick={() => handleNewSession(false)}
                        disabled={loading || !activeLot || !selectedBox || lotsLoading}
                        className="w-full h-12 text-sm font-bold shadow-md transition-all hover:shadow-lg disabled:hover:shadow-none bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            Starting Session...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ScanBarcode className="h-5 w-5" />
                            Start Scanning Session
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          ) : (
            <div className="relative flex flex-col gap-4">
              {loading && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card rounded-xl">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border border-border rounded-xl shadow-lg">
                    <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-sm font-semibold text-foreground">Completing session...</span>
                  </div>
                </div>
              )}

              {/* ISBN lookup loading card */}
              {isbnLoading && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-card border border-primary/30 rounded-xl shadow-lg animate-in slide-in-from-bottom-3 fade-in duration-200">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Adding ISBN...</p>
                    <p className="text-xs text-muted-foreground">Verifying with iLMS</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                    <Warehouse className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                      Warehouse Receiving
                    </h1>
                    <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      Active scanning session for <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-white", brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500')}>{brand}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Active session banner */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Top accent strip */}
                <div className="h-0.5 w-full bg-primary/80" />
                {/* On mobile: flex-col (info on top, buttons below). On sm+: flex-row inline. */}
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
                  {/* Info */}
                  <div className="flex items-start gap-3 sm:gap-5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center divide-x divide-border min-w-0">
                      <div className="pr-3 sm:pr-5 shrink-0">
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Lot</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{activeLot}</p>
                      </div>
                      {currentBoxNumber && (
                        <div className="px-3 sm:px-5 shrink-0">
                          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Box</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{currentBoxNumber}</p>
                          <p className="text-[10px] text-muted-foreground">{currentBoxBooks} books</p>
                        </div>
                      )}
                      <div className="pl-3 sm:pl-5 min-w-0">
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Operator</p>
                        <p className="text-sm font-bold text-foreground mt-0.5 truncate">{userName || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Buttons — full-width equal halves on mobile, auto-width inline on desktop */}
                  <div className="flex gap-2 shrink-0">
                    <button onClick={handleResetSession}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-sm rounded-lg border border-red-400 text-red-500 hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all">
                      <X className="h-3.5 w-3.5" />
                      Reset
                    </button>
                    {scannedBooks.length === 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-1 sm:flex-none inline-flex">
                            <button
                              onClick={handleCloseSession}
                              disabled
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            >
                              <CircleCheck className="h-3.5 w-3.5" />
                              Complete Session
                            </button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={8} variant="destructive">
                          Scan at least one book first
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        onClick={handleCloseSession}
                        disabled={loading}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        <CircleCheck className="h-3.5 w-3.5" />
                        Complete Session
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              {currentSession && (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {/* Mobile: centered col, no icon. Desktop: original — icon left, left-aligned text */}
                  <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left">
                    <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                      <ScanBarcode className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] text-primary sm:text-muted-foreground font-medium uppercase tracking-wide">Total Scanned</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary sm:text-foreground leading-none mt-0.5">{currentSession.total_scanned}</p>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left">
                    <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
                      <CircleCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] text-emerald-500 sm:text-muted-foreground font-medium uppercase tracking-wide">Processable</p>
                      <p className="text-xl sm:text-2xl font-bold text-emerald-500 sm:text-foreground leading-none mt-0.5">{currentSession.total_processable}</p>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left">
                    <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
                      <CircleX className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-[11px] text-destructive sm:text-muted-foreground font-medium uppercase tracking-wide">Non-Processable</p>
                      <p className="text-xl sm:text-2xl font-bold text-destructive sm:text-foreground leading-none mt-0.5">{currentSession.total_non_processable}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanner */}
              <ScannerInput onScan={handleScan} />

              {/* Scan log */}
              <div className="bg-card border border-primary/30 rounded-xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/10">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-primary">Scan Log</h3>
                    {scannedBooks.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-600">{scannedBooks.length}</span>
                    )}
                  </div>
                  {scannedBooks.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">Most recent on top</p>
                  )}
                </div>
                {scannedBooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-center min-h-[240px] py-12">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <ScanBarcode className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Awaiting scan</p>
                      <p className="text-xs text-muted-foreground">Scan a book barcode to add it here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {/* Scan log table — horizontally scrollable on mobile */}
                    <div className="overflow-x-auto">
                      {/* Header row */}
                      <div className="flex gap-2 px-3 sm:px-5 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 min-w-[480px]">
                        <div className="w-[110px] shrink-0">ISBN</div>
                        <div className="flex-1 min-w-0">Title</div>
                        <div className="w-[140px] sm:w-[160px] shrink-0 text-center">Status</div>
                        <div className="w-[60px] sm:w-[80px] shrink-0 text-right">Remove</div>
                      </div>
                      {/* Scan log entries */}
                      <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                        {scannedBooks.map((book, idx) => (
                          <div
                            key={`${book.id}-${idx}`}
                            className={`flex gap-2 px-3 sm:px-5 py-3 items-center transition-colors hover:bg-muted/30 min-w-[480px] ${
                              book.scan_status === 'non_processable' ? 'bg-destructive/5' : ''
                            }`}
                          >
                            <div className="w-[110px] shrink-0">
                              <p className="text-[11px] sm:text-xs font-mono text-foreground">{book.isbn}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] sm:text-xs text-foreground font-medium truncate leading-snug">{book.title}</p>
                              {book.flag_issue && (
                                <p className="text-[10px] text-destructive mt-0.5 truncate">{issueLabel(book.flag_issue)}{book.flag_remarks ? ` — ${book.flag_remarks}` : ''}</p>
                              )}
                            </div>
                            <div className="w-[140px] sm:w-[160px] shrink-0 flex items-center justify-center gap-1 sm:gap-2">
                              {book.scan_status === 'processable' ? (
                                <>
                                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">
                                    <CircleCheck className="h-3 w-3" />
                                    Processable
                                  </span>
                                  <button
                                    onClick={() => openFlagModal(book)}
                                    className="text-[10px] text-muted-foreground hover:text-destructive underline transition-colors"
                                  >
                                    Flag
                                  </button>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 whitespace-nowrap">
                                  <CircleX className="h-3 w-3" />
                                  Non-Processable
                                </span>
                              )}
                            </div>
                            <div className="w-[60px] sm:w-[80px] shrink-0 flex items-center justify-end gap-1 sm:gap-2">
                              <p className="hidden sm:block text-[10px] text-muted-foreground mt-0.5">
                                {new Date(book.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </p>
                              <button
                                onClick={() => handleRemoveBook(book.id)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Remove from scan log"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}