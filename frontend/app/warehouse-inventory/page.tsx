'use client'

import { useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { ScannerInput } from '@/components/scanner-input'
import { BookInfoCard } from '@/components/book-info-card'
import { useToast } from '@/hooks/use-toast'
import { getValidAccessToken } from '@/lib/auth-api'
import { AlertTriangle, CheckCircle2, Package, X } from 'lucide-react'
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

interface ScannedBook {
  id: string
  isbn: string
  title: string
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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function WarehouseInventoryPage() {
  const [activeLot, setActiveLot] = useState('Lot 1')
  const [sessionActive, setSessionActive] = useState(false)
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([])
  const [currentScan, setCurrentScan] = useState<any>(null)
  const [currentSession, setCurrentSession] = useState<WarehouseSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentBoxNumber, setCurrentBoxNumber] = useState('')
  const [currentBoxBooks, setCurrentBoxBooks] = useState(0)
  // Flag modal state
  const [flagModalBook, setFlagModalBook] = useState<ScannedBook | null>(null)
  const [flagIssue, setFlagIssue] = useState('')
  const [flagRemarks, setFlagRemarks] = useState('')
  const [flagSaving, setFlagSaving] = useState(false)
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)
  const { toast } = useToast()

  const lots = Array.from({ length: 100 }, (_, i) => `Lot ${i + 1}`)

  const handleNewSession = async () => {
    if (!activeLot) { alert('Please select a lot first'); return }
    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const response = await fetch(`${API_URL}/api/warehouse/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lot_number: activeLot })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to start session')
      setCurrentSession({ ...data.session, total_processable: 0, total_non_processable: 0 })
      setSessionActive(true)
      setScannedBooks([])
      setCurrentScan(null)
      setCurrentBoxNumber('')
      setCurrentBoxBooks(0)
      toast({ title: 'Session Started', description: `Session started for ${data.lot_number}.` })
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to start session', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handleCloseSession = async () => {
    if (!currentSession) return
    setConfirmCompleteOpen(true)
  }

  const confirmCloseSession = async () => {
    if (!currentSession) return
    setConfirmCompleteOpen(false)
    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      await fetch(`${API_URL}/api/warehouse/sessions/${currentSession.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      setSessionActive(false); setScannedBooks([]); setCurrentScan(null); setCurrentSession(null)
      toast({ title: 'Session Closed', description: 'Session closed successfully.' })
    } catch { toast({ title: 'Error', description: 'Failed to complete session', variant: 'destructive' }) } finally { setLoading(false) }
  }

  const handleScan = async (isbn: string) => {
    if (!currentSession) return
    if (currentScan) await saveBook(currentScan, 'processable', null, null)
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/books/ilms/search/${isbn}`)
      const data = await response.json()
      if (data.success && data.data && !data.data.Message) {
        setCurrentScan({ isbn: data.data.ISBN || isbn, title: data.data.Title || `ISBN: ${isbn}`, found: true })
      } else {
        setCurrentScan({ isbn, title: `ISBN: ${isbn}`, found: false })
        toast({ title: 'Book Not Found', description: 'ISBN not found in iLMS.', variant: 'destructive' })
      }
    } catch {
      setCurrentScan({ isbn, title: `ISBN: ${isbn}`, found: false })
      toast({ title: 'API Error', description: 'Failed to fetch book details.', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const saveBook = async (bookData: any, scan_status: 'processable' | 'non_processable', flag_issue: string | null, flag_remarks: string | null) => {
    if (!currentSession || !bookData) return
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const response = await fetch(`${API_URL}/api/warehouse/sessions/${currentSession.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isbn: bookData.isbn, title: bookData.title, scan_status, rejection_reason: flag_issue || null, notes: flag_remarks || null })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to process book')
      if (data.currentBox) {
        if (data.currentBox.box_number !== currentBoxNumber) {
          setCurrentBoxNumber(data.currentBox.box_number)
          setCurrentBoxBooks(1)
        } else {
          setCurrentBoxBooks(prev => prev + 1)
        }
      }
      const newBook: ScannedBook = {
        id: data.scanLog.id,
        isbn: bookData.isbn,
        title: bookData.title,
        scan_status,
        flag_issue: flag_issue || undefined,
        flag_remarks: flag_remarks || undefined,
        timestamp: new Date(data.scanLog.scanned_at)
      }
      setScannedBooks(prev => [newBook, ...prev])
      setCurrentSession(prev => prev ? {
        ...prev,
        total_scanned: prev.total_scanned + 1,
        total_processable: scan_status === 'processable' ? prev.total_processable + 1 : prev.total_processable,
        total_non_processable: scan_status === 'non_processable' ? prev.total_non_processable + 1 : prev.total_non_processable,
      } : null)
      setCurrentScan(null)
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save book', variant: 'destructive' })
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
      // If flagging the current scan (no scan id yet), use saveBook directly
      if (!flagModalBook.id) {
        await saveBook({ isbn: flagModalBook.isbn, title: flagModalBook.title }, 'non_processable', flagIssue, flagRemarks)
        setCurrentScan(null)
        setFlagModalBook(null)
        return
      }
      // Re-flagging an already-saved scan log entry — update via warehouse scan patch
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const res = await fetch(`${API_URL}/api/warehouse/scans/${flagModalBook.id}/flag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rejection_reason: flagIssue, notes: flagRemarks })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
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

  const issueLabel = (val: string) => FLAG_ISSUES.find(i => i.value === val)?.label || val

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">

          {/* Confirm Complete Session Modal */}
          {confirmCompleteOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmCompleteOpen(false)}>
              <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-foreground mb-2">Complete Session?</h3>
                <p className="text-sm text-muted-foreground mb-5">This will close the current session. Scanned books will be saved.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setConfirmCompleteOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Cancel</button>
                  <button onClick={confirmCloseSession} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Complete</button>
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
                <p className="text-xs text-muted-foreground mb-3">{flagModalBook.isbn} — {flagModalBook.title}</p>
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
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground block mb-1">Lot</label>
                <Select value={activeLot} onValueChange={setActiveLot}>
                  <SelectTrigger className="w-full sm:w-64 h-9">
                    <SelectValue placeholder="Select a lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button onClick={handleNewSession} disabled={loading}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm disabled:opacity-50">
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
                </div>
                <button onClick={handleCloseSession} disabled={loading}
                  className="px-4 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                  Complete Session
                </button>
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

              {/* Current book preview */}
              {currentScan && (
                <div className="bg-card border-2 border-primary/40 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Currently scanning</p>
                    <p className="text-sm font-semibold text-foreground">{currentScan.isbn}</p>
                    <p className="text-sm text-muted-foreground">{currentScan.title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => saveBook(currentScan, 'processable', null, null)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle2 className="h-4 w-4" /> Processable
                    </button>
                    <button
                      onClick={() => { setFlagModalBook({ id: '', isbn: currentScan.isbn, title: currentScan.title, scan_status: 'non_processable', timestamp: new Date() }); setFlagIssue(''); setFlagRemarks('') }}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                      <AlertTriangle className="h-4 w-4" /> Non-Processable
                    </button>
                  </div>
                </div>
              )}

              {/* Scan log */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Scan Log</h3>
                {scannedBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No books scanned yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {scannedBooks.map(book => (
                      <div key={book.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">{book.isbn}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>
                          {book.flag_issue && (
                            <p className="text-[10px] text-red-500 mt-0.5">{issueLabel(book.flag_issue)}{book.flag_remarks ? ` — ${book.flag_remarks}` : ''}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
