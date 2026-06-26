'use client'

import { useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Barcode, CheckCircle2, AlertTriangle, Package } from 'lucide-react'
import { getValidAccessToken } from '@/lib/auth-api'
import { ILMSTestPanel } from '@/components/ilms-test-panel'

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

interface Book {
  isbn: string
  title?: string
  found: boolean
}

interface ScanLog {
  id: string
  isbn: string
  title?: string
  scan_status: 'processable' | 'non_processable'
  rejection_reason?: string
  scanned_at: string
}

interface Session {
  id: string
  status: string
  total_scanned: number
  total_processable: number
  total_non_processable: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function WarehousePage() {
  const [lotNumber, setLotNumber] = useState('')
  const [sessionActive, setSessionActive] = useState(false)
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [scanInput, setScanInput] = useState('')
  const [currentBook, setCurrentBook] = useState<Book | null>(null)
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([])
  const [loading, setLoading] = useState(false)
  // Flag selection for current book
  const [flagIssue, setFlagIssue] = useState('')
  const [flagRemarks, setFlagRemarks] = useState('')
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)

  const startSession = async () => {
    if (!lotNumber.trim()) { alert('Please enter a Lot Number'); return }
    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const response = await fetch(`${API_URL}/api/warehouse/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lot_number: lotNumber.trim() })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to start session')
      setCurrentSession({ ...data.session, total_processable: 0, total_non_processable: 0 })
      setSessionActive(true)
      setScanLogs([])
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start session')
    } finally { setLoading(false) }
  }

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !scanInput.trim() || !currentSession) return
    const isbn = scanInput.trim()
    setLoading(true)
    setScanInput('')
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const bookResponse = await fetch(`${API_URL}/api/books/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isbn })
      })
      const bookData = await bookResponse.json()
      setCurrentBook({ isbn, title: bookData.book?.title, found: bookData.found })
      setFlagIssue('')
      setFlagRemarks('')
    } catch {
      alert('Failed to scan book')
    } finally { setLoading(false) }
  }

  const processBook = async (scan_status: 'processable' | 'non_processable') => {
    if (!currentBook || !currentSession) return
    if (scan_status === 'non_processable' && !flagIssue) {
      alert('Please select an issue before flagging as Non-Processable.')
      return
    }
    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const response = await fetch(`${API_URL}/api/warehouse/sessions/${currentSession.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          isbn: currentBook.isbn,
          title: currentBook.title,
          scan_status,
          rejection_reason: scan_status === 'non_processable' ? flagIssue : null,
          notes: flagRemarks || null
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to process book')
      setScanLogs(prev => [{ ...data.scanLog, scan_status }, ...prev])
      setCurrentSession(prev => prev ? {
        ...prev,
        total_scanned: prev.total_scanned + 1,
        total_processable: scan_status === 'processable' ? prev.total_processable + 1 : prev.total_processable,
        total_non_processable: scan_status === 'non_processable' ? prev.total_non_processable + 1 : prev.total_non_processable,
      } : null)
      setCurrentBook(null)
      setFlagIssue('')
      setFlagRemarks('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process book')
    } finally { setLoading(false) }
  }

  const completeSession = async () => {
    if (!currentSession) return
    setConfirmCompleteOpen(true)
  }

  const confirmComplete = async () => {
    if (!currentSession) return
    setConfirmCompleteOpen(false)
    setLoading(true)
    try {
      const token = await getValidAccessToken()
      if (!token) throw new Error('Authentication required.')
      const response = await fetch(`${API_URL}/api/warehouse/sessions/${currentSession.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to complete session')
      setSessionActive(false); setCurrentSession(null); setScanLogs([]); setLotNumber('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to complete session')
    } finally { setLoading(false) }
  }

  const issueLabel = (val: string) => FLAG_ISSUES.find(i => i.value === val)?.label || val

  return (
    <div className="flex min-h-screen bg-white">
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
                  <button onClick={confirmComplete} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Complete</button>
                </div>
              </div>
            </div>
          )}

          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Warehouse Station</h1>
            <p className="text-sm text-muted-foreground mt-1">Scan books into a single box per session. Flag Non-Processable books inline — no re-boxing.</p>
          </header>

          <ILMSTestPanel />

          {!sessionActive ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" /> Start Receiving Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Lot Number</label>
                  <input
                    value={lotNumber}
                    onChange={e => setLotNumber(e.target.value)}
                    placeholder="e.g. Lot-1"
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">All books scanned in this session go into one box. Flag Non-Processable ones inline.</p>
                </div>
                <button onClick={startSession} disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm disabled:opacity-50">
                  {loading ? 'Starting...' : 'Start Session'}
                </button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-5">
                    <div className="text-2xl font-bold">{currentSession?.total_scanned || 0}</div>
                    <p className="text-xs text-muted-foreground">Total Scanned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <div className="text-2xl font-bold text-green-600">{currentSession?.total_processable || 0}</div>
                    <p className="text-xs text-muted-foreground">Processable</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <div className="text-2xl font-bold text-red-600">{currentSession?.total_non_processable || 0}</div>
                    <p className="text-xs text-muted-foreground">Non-Processable</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <button onClick={completeSession} disabled={loading}
                      className="w-full py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                      Complete Session
                    </button>
                  </CardContent>
                </Card>
              </div>

              {/* Scanner */}
              <Card className="border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-blue-600" /> Scan ISBN / Barcode
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <input
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={handleScan}
                    placeholder="Scan or enter ISBN and press Enter..."
                    className="w-full h-12 text-lg rounded-md border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                    disabled={loading || !!currentBook}
                  />
                </CardContent>
              </Card>

              {/* Current Book */}
              {currentBook && (
                <Card className="border-2 border-orange-400">
                  <CardHeader>
                    <CardTitle>Book Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!currentBook.found && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 shrink-0" /> Book not found in database — flagging allowed.
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">ISBN</p>
                      <p className="text-lg">{currentBook.isbn}</p>
                    </div>
                    {currentBook.title && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Title</p>
                        <p className="text-base font-semibold">{currentBook.title}</p>
                      </div>
                    )}

                    {/* Flag selection — shown always so staff can pre-select before deciding */}
                    <div className="border-t pt-4 space-y-2">
                      <p className="text-xs font-medium text-gray-700">If Non-Processable, select issue:</p>
                      <select value={flagIssue} onChange={e => setFlagIssue(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none">
                        <option value="">— No issue (Processable) —</option>
                        {FLAG_ISSUES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                      </select>
                      {flagIssue && (
                        <input type="text" value={flagRemarks} onChange={e => setFlagRemarks(e.target.value)}
                          placeholder="Remarks / Page No. (optional)"
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none" />
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => processBook('processable')} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                        <CheckCircle2 className="h-4 w-4" /> Processable
                      </button>
                      <button onClick={() => processBook('non_processable')} disabled={loading || !flagIssue}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                        <AlertTriangle className="h-4 w-4" /> Non-Processable
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Scan History */}
              <Card>
                <CardHeader>
                  <CardTitle>Scan History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {scanLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No books scanned yet</p>
                    ) : (
                      scanLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{log.isbn}</p>
                            <p className="text-xs text-muted-foreground truncate">{log.title || 'Unknown Title'}</p>
                            {log.rejection_reason && (
                              <p className="text-[10px] text-red-500 mt-0.5">{issueLabel(log.rejection_reason)}</p>
                            )}
                          </div>
                          <span className={`ml-3 shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                            log.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
