'use client'

import { useEffect, useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { ScannerInput } from '@/components/scanner-input'
import { useToast } from '@/hooks/use-toast'
import { getValidAccessToken, fetchUserProfile } from '@/lib/auth-api'
import { AlertTriangle, Package, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

// Static lots for demo purposes (will be replaced with API calls later)
const STATIC_LOTS = Array.from({ length: 100 }, (_, i) => ({
  id: `lot-${i + 1}`,
  lot_number: `Lot ${i + 1}`
}))

// Static boxes for demo purposes (will be replaced with API calls later)
const STATIC_BOXES = Array.from({ length: 100 }, (_, i) => ({
  id: `box-${i + 1}`,
  box_number: `${i + 1}/100`,
  is_sealed: false
}))

interface ScannedBook {
  id: string
  isbn: string
  title: string
  author: string
  scan_status: 'processable' | 'non_processable'
  flag_issue?: string
  flag_remarks?: string
  timestamp: Date
}

interface WarehouseSession {
  id: string
  status: string
  total_scanned: number
  total_processable: number
  total_non_processable: number
  box_id?: string | null
}

interface Lot {
  id: string
  lot_number: string
}

interface Box {
  id: string
  box_number: string
  is_sealed?: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function WarehousePage() {
  const [activeLot, setActiveLot] = useState<string>('')
  const [lots, setLots] = useState<Lot[]>(STATIC_LOTS)
  const [selectedBox, setSelectedBox] = useState<string>('')
  const [boxes, setBoxes] = useState<Box[]>(STATIC_BOXES)
  const [boxesLoading, setBoxesLoading] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([])
  const [currentSession, setCurrentSession] = useState<WarehouseSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentBoxNumber, setCurrentBoxNumber] = useState('')
  const [currentBoxBooks, setCurrentBoxBooks] = useState(0)
  const [bookCounter, setBookCounter] = useState(0)
  const [userName, setUserName] = useState<string>('')
  // Flag modal state
  const [flagModalBook, setFlagModalBook] = useState<ScannedBook | null>(null)
  const [flagIssue, setFlagIssue] = useState('')
  const [flagRemarks, setFlagRemarks] = useState('')
  const [flagSaving, setFlagSaving] = useState(false)
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  // Complete session modal state
  const [totalBooksExpected, setTotalBooksExpected] = useState('')
  const [issueIsbn, setIssueIsbn] = useState('')
  const [issueType, setIssueType] = useState<'missing' | 'extra'>('missing')
  const [issues, setIssues] = useState<Array<{ isbn: string; type: 'missing' | 'extra'; title?: string; author?: string }>>([])
  const [fetchingIssueBook, setFetchingIssueBook] = useState(false)
  const { toast } = useToast()

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

  const handleNewSession = async () => {
    if (!activeLot) { alert('Please select a lot first'); return }
    if (!selectedBox) { alert('Please select a box first'); return }
    
    // Set up local state without writing to database yet
    setCurrentSession({ 
      id: 'pending',
      total_scanned: 0,
      total_processable: 0, 
      total_non_processable: 0 
    })
    setSessionActive(true)
    setScannedBooks([])
    setBookCounter(0)
    const selected = boxes.find(b => b.id === selectedBox)
    setCurrentBoxNumber(selected?.box_number || '')
    setCurrentBoxBooks(0)
    toast({ title: 'Session Started', description: `Session started for ${activeLot}. Data will be saved upon completion.` })
  }

  const handleCloseSession = async () => {
    if (!currentSession) return
    if (scannedBooks.length === 0) {
      toast({ title: 'Cannot Complete Session', description: 'Please scan at least one book before completing the session.', variant: 'destructive' })
      return
    }
    // Reset modal state
    setTotalBooksExpected('')
    setIssueIsbn('')
    setIssueType('missing')
    setIssues([])
    setConfirmCompleteOpen(true)
  }

  const confirmCloseSession = async () => {
    if (!currentSession) return
    if (!totalBooksExpected.trim()) {
      toast({ title: 'Required Field', description: 'Please enter the total books expected.', variant: 'destructive' })
      return
    }

    const expected = parseInt(totalBooksExpected)
    if (isNaN(expected)) {
      toast({ title: 'Invalid Input', description: 'Total books expected must be a valid number.', variant: 'destructive' })
      return
    }

    const missingCount = issues.filter(i => i.type === 'missing').length
    const extraCount = issues.filter(i => i.type === 'extra').length
    const calculatedExpected = scannedBooks.length + missingCount - extraCount

    if (expected !== calculatedExpected) {
      toast({ 
        title: 'Mismatch Detected', 
        description: `Total expected books (${expected}) does not match scanned books (${scannedBooks.length}) with missing (${missingCount}) and extra (${extraCount}).`, 
        variant: 'destructive' 
      })
      return
    }

    setConfirmCompleteOpen(false)
    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')

      // 1. Create the session in the database
      const startRes = await fetch(`${API_URL}/api/warehouse/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lot_number: activeLot, box_id: selectedBox, box_number: boxes.find(b => b.id === selectedBox)?.box_number || '' })
      })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error || 'Failed to create session on backend')
      const realSessionId = startData.session.id

      // 2. Save all scanned books to database
      const savedBookIds: string[] = []
      for (const book of scannedBooks) {
        try {
          const dbId = await saveBookToDB(book, book.scan_status, book.flag_issue || null, book.flag_remarks || null, realSessionId)
          savedBookIds.push(dbId)
        } catch (error) {
          toast({ title: 'Error', description: `Failed to save book ${book.isbn}. Session not fully completed.`, variant: 'destructive' })
          throw error
        }
      }

      // 3. Complete the session
      await fetch(`${API_URL}/api/warehouse/sessions/${realSessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          total_books_expected: parseInt(totalBooksExpected),
          issues: issues
        })
      })
      setSessionActive(false); setScannedBooks([]); setBookCounter(0); setCurrentSession(null); setSelectedBox(''); setCurrentBoxNumber(''); setCurrentBoxBooks(0)
      setTotalBooksExpected('')
      setIssueIsbn('')
      setIssues([])
      toast({ title: 'Session Closed', description: 'Session closed successfully.' })
    } catch { toast({ title: 'Error', description: 'Failed to complete session', variant: 'destructive' }) } finally { setLoading(false) }
  }

  const handleResetSession = () => {
    if (!currentSession) return
    setConfirmResetOpen(true)
  }

  const confirmResetSession = () => {
    if (!currentSession) return
    setConfirmResetOpen(false)
    // Clear local state without calling API (data won't be saved to database)
    setSessionActive(false)
    setScannedBooks([])
    setBookCounter(0)
    setCurrentSession(null)
    setSelectedBox('')
    setCurrentBoxNumber('')
    setCurrentBoxBooks(0)
    toast({ title: 'Session Reset', description: 'Session has been reset. Data was not saved.' })
  }

  const handleAddIssue = async () => {
    if (!issueIsbn.trim()) return
    setFetchingIssueBook(true)
    try {
      const response = await fetch(`${API_URL}/api/books/ilms/search/${issueIsbn}`)
      const data = await response.json()
      const issueData = {
        isbn: issueIsbn,
        type: issueType,
        title: data.success && data.data && !data.data.Message ? data.data.Title : `Book ${bookCounter + 1}`,
        author: data.success && data.data && !data.data.Message ? data.data.Author : `Author ${bookCounter + 1}`
      }
      setIssues(prev => [...prev, issueData])
      setIssueIsbn('')
    } catch {
      // Even if fetch fails, add the issue with generated title/author
      const issueData = {
        isbn: issueIsbn,
        type: issueType,
        title: `Book ${bookCounter + 1}`,
        author: `Author ${bookCounter + 1}`
      }
      setIssues(prev => [...prev, issueData])
      setIssueIsbn('')
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
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/books/ilms/search/${isbn}`)
      const data = await response.json()
      if (data.success && data.data && !data.data.Message) {
        // Add to local state only (not saving to DB yet)
        saveBookToLocal({ isbn: data.data.ISBN || isbn, title: data.data.Title || `ISBN: ${isbn}`, author: data.data.Author || `Author ${bookCounter + 1}` }, 'processable', null, null)
      } else {
        // Book not found in iLMS, but still add to local scan log with generated title and author
        saveBookToLocal({ isbn, title: `Book ${bookCounter + 1}`, author: `Author ${bookCounter + 1}` }, 'processable', null, null)
        toast({ title: 'Book Not Found', description: 'ISBN not found in iLMS. Added to scan log anyway.', variant: 'destructive' })
      }
    } catch {
      // API error, but still add to local scan log with generated title and author
      saveBookToLocal({ isbn, title: `Book ${bookCounter + 1}`, author: `Author ${bookCounter + 1}` }, 'processable', null, null)
      toast({ title: 'API Error', description: 'Failed to fetch book details. Added to scan log anyway.', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const saveBookToLocal = (bookData: any, scan_status: 'processable' | 'non_processable', flag_issue: string | null, flag_remarks: string | null) => {
    if (!currentSession || !bookData) return
    // Increment book count for the selected box
    setCurrentBoxBooks(prev => prev + 1)
    setBookCounter(prev => prev + 1)
    const newBook: ScannedBook = {
      id: `local-${Date.now()}`, // Temporary ID
      isbn: bookData.isbn,
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

  const saveBookToDB = async (bookData: any, scan_status: 'processable' | 'non_processable', flag_issue: string | null, flag_remarks: string | null, sessionId: string) => {
    if (!bookData) return
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const response = await fetch(`${API_URL}/api/warehouse/sessions/${sessionId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isbn: bookData.isbn, title: bookData.title, author: bookData.author, scan_status, rejection_reason: flag_issue || null, notes: flag_remarks || null })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to process book')
      return data.scanLog.id
    } catch (error) {
      console.error('Error saving book to DB:', error)
      throw error
    }
  }

  const openFlagModal = (book: ScannedBook) => {
    setFlagModalBook(book)
    setFlagIssue(book.flag_issue || '')
    setFlagRemarks(book.flag_remarks || '')
  }

  const saveFlagFromLog = async () => {
    if (!flagModalBook || !flagIssue) { toast({ title: 'Select an issue first', variant: 'destructive' }); return }
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
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">

          {/* Confirm Complete Session Modal */}
          {confirmCompleteOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmCompleteOpen(false)}>
              <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-foreground mb-4">Complete Session</h3>
                
                {/* Total Books Expected */}
                <div className="mb-4">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-sm font-medium text-foreground">Total Books Expected</label>
                    <label className="text-sm font-medium text-red-500">*</label>
                  </div>
                  
                  <input
                    type="number"
                    value={totalBooksExpected}
                    onChange={(e) => setTotalBooksExpected(e.target.value)}
                    placeholder="Enter expected total count"
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Issue Tracking */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-2 block">Discrepancies (Missing/Extra Books)</label>
                  
                  {/* Issue Input */}
                  <div className="flex gap-2 mb-3">
                    <Select value={issueType} onValueChange={(v) => setIssueType(v as 'missing' | 'extra')}>
                      <SelectTrigger className="w-28 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="missing">Missing</SelectItem>
                        <SelectItem value="extra">Extra</SelectItem>
                      </SelectContent>
                    </Select>
                    <input
                      type="text"
                      value={issueIsbn}
                      onChange={(e) => setIssueIsbn(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyPress={handleIssueKeyPress}
                      placeholder="Scan or Input ISBN (numbers only) - book details will auto-fetch"
                      className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleAddIssue}
                      disabled={!issueIsbn.trim() || fetchingIssueBook}
                      className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50"
                    >
                      {fetchingIssueBook ? 'Adding…' : 'Add'}
                    </button>
                  </div>

                  {/* Issues List */}
                  {issues.length > 0 && (
                    <>
                      {/* Header row */}
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                        <div className="col-span-2">Type</div>
                        <div className="col-span-3">ISBN</div>
                        <div className="col-span-4">Book Title</div>
                        <div className="col-span-2">Book Author</div>
                        <div className="col-span-1 text-right">Action</div>
                      </div>
                      {/* Issues entries */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {issues.map((issue, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors items-center">
                            <div className="col-span-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${issue.type === 'missing' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {issue.type === 'missing' ? 'Missing' : 'Extra'}
                              </span>
                            </div>
                            <div className="col-span-3">
                              <p className="text-xs font-medium text-foreground truncate">{issue.isbn}</p>
                            </div>
                            <div className="col-span-4">
                              <p className="text-[11px] text-muted-foreground truncate">{issue.title}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[11px] text-muted-foreground truncate">{issue.author}</p>
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                onClick={() => handleRemoveIssue(issue.isbn)}
                                className="text-[10px] text-muted-foreground hover:text-destructive underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Summary */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Expected:</span> {totalBooksExpected || 0} books
                    <span className="ml-3">
                      <span className="font-medium">Scanned:</span> {currentSession?.total_scanned || 0} books
                    </span>
                    {issues.length > 0 && (
                      <span className="ml-3">
                        <span className="font-medium">Issues:</span> {issues.length} ({issues.filter(i => i.type === 'missing').length} missing, {issues.filter(i => i.type === 'extra').length} extra)
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    * All scanned books will be saved to database when you confirm completion
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => {
                    setConfirmCompleteOpen(false)
                    setTotalBooksExpected('')
                    setIssueIsbn('')
                    setIssues([])
                  }} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                  <button onClick={confirmCloseSession} disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50">
                    {loading ? 'Completing…' : 'Confirm Complete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reset Session Modal */}
          {confirmResetOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmResetOpen(false)}>
              <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-foreground mb-2">Reset Session?</h3>
                <p className="text-sm text-muted-foreground mb-5">This will reset the current session. All scanned data will be lost and not saved.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setConfirmResetOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                  <button onClick={confirmResetSession} className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium">Reset</button>
                </div>
              </div>
            </div>
          )}

        {/* Flag Modal */}
          {flagModalBook && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setFlagModalBook(null)}>
              <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Flag as Non-Processable
                  </h3>
                  <button onClick={() => setFlagModalBook(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{flagModalBook.isbn} — {flagModalBook.title} — {flagModalBook.author}</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Issue</label>
                    <select value={flagIssue} onChange={e => setFlagIssue(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Select issue…</option>
                      {FLAG_ISSUES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Remarks / Page No. (optional)</label>
                    <input type="text" value={flagRemarks} onChange={e => setFlagRemarks(e.target.value)}
                      placeholder="e.g. page 42"
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setFlagModalBook(null)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                  <button onClick={saveFlagFromLog} disabled={!flagIssue || flagSaving}
                    className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium disabled:opacity-50">
                    {flagSaving ? 'Saving…' : 'Confirm Flag'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Warehouse & Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">Scan books into a single box. Flag Non-Processable ones inline — no re-boxing needed.</p>
          </header>

          {/* Session Control */}
          {!sessionActive ? (
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-end justify-between gap-4">
              <div className="inline-flex flex-wrap items-end gap-2">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Lot</label>
                  <Select value={activeLot} onValueChange={setActiveLot}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="Select a lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {lots.map(l => (
                        <SelectItem key={l.id} value={l.lot_number}>{l.lot_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Box</label>
                  <Select value={selectedBox} onValueChange={setSelectedBox} disabled={!activeLot}>
                    <SelectTrigger className="w-48 h-9">
                      <SelectValue placeholder={!activeLot ? 'Select a lot first' : 'Select a box'} />
                    </SelectTrigger>
                    <SelectContent>
                      {boxes.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.box_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <button onClick={handleNewSession} disabled={loading || !activeLot || !selectedBox}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Starting…' : 'Start Session'}
              </button>
            </div>
          ) : (
            <>
              {/* Active session bar */}
              <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4">
                <div className="flex items-center gap-4">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Lot</p>
                    <p className="text-sm font-semibold text-foreground">{activeLot}</p>
                  </div>
                  {currentBoxNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">Current Box</p>
                      <p className="text-sm font-semibold text-foreground">{currentBoxNumber} <span className="font-normal text-muted-foreground">({currentBoxBooks} books)</span></p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">User</p>
                    <p className="text-sm font-semibold text-foreground">{userName || 'Unknown User'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleResetSession}
                    className="px-4 py-1.5 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors">
                    Reset Session
                  </button>
                  <button onClick={handleCloseSession} disabled={loading || scannedBooks.length === 0}
                    className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Complete Session
                  </button>
                </div>
              </div>

              {/* Stats */}
              {currentSession && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Total Scanned</p>
                    <p className="text-2xl font-bold text-blue-900">{currentSession.total_scanned}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Processable</p>
                    <p className="text-2xl font-bold text-green-900">{currentSession.total_processable}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-medium">Non-Processable</p>
                    <p className="text-2xl font-bold text-red-900">{currentSession.total_non_processable}</p>
                  </div>
                </div>
              )}

              {/* Scanner */}
              <ScannerInput onScan={handleScan} />

              {/* Scan log */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Scan Log</h3>
                {scannedBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No books scanned yet.</p>
                ) : (
                  <>
                    {/* Header row */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                      <div className="col-span-2">ISBN</div>
                      <div className="col-span-3">Book Title</div>
                      <div className="col-span-3">Book Author</div>
                      <div className="col-span-3 text-right">Status</div>
                      <div className="col-span-1 text-right">Action</div>
                    </div>
                    {/* Scan log entries */}
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {scannedBooks.map(book => (
                        <div key={book.id} className="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors items-center">
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
                                <button onClick={() => openFlagModal(book)} className="text-[10px] text-muted-foreground hover:text-destructive underline">Flag</button>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">
                                <AlertTriangle className="h-2.5 w-2.5" /> Non-Processable
                              </span>
                            )}
                          </div>
                          <div className="col-span-1 flex items-center justify-end">
                            <button onClick={() => handleRemoveBook(book.id)} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors" title="Remove from scan log">
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
      </main>
    </div>
  )
}
