'use client'

import { useState, useEffect, useRef } from 'react'
import { authFetch } from '@/lib/auth-api'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { Barcode, Package, Search, ChevronDown, ChevronRight, BookOpen, History, Printer } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bwipjs = require('bwip-js')

interface LogEntry {
  id: string
  isbn: string
  title: string
  language: string
  scannedAt: string
  printed: boolean
}

interface BookInBox {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  scanned_at: string
}

interface Box {
  id: string
  box_number: string
  lot_id: string
  total_books: number
  books_received: number
  books_transmitted: number
  current_stage: string
  created_at: string
  lot: { lot_number: string; status: string }
  books: BookInBox[] | { count: number }[]
  scans: { count: number }[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const STAGE_COLORS: Record<string, string> = {
  warehouse:  'bg-gray-100 text-gray-700',
  inventory:  'bg-slate-100 text-slate-700',
  cut:        'bg-orange-100 text-orange-700',
  qc:         'bg-yellow-100 text-yellow-700',
  scan:       'bg-blue-100 text-blue-700',
  qa:         'bg-purple-100 text-purple-700',
  transmit:   'bg-green-100 text-green-700',
  storage:    'bg-emerald-100 text-emerald-700',
}

const LOT_OPTIONS = Array.from({ length: 100 }, (_, i) => `Lot ${i + 1}`)
const LOT_ALIASES = Array.from({ length: 100 }, (_, i) => [`Lot ${i + 1}`, `Lot-${i + 1}`, `LOT ${i + 1}`, `LOT-${i + 1}`])

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'boxes' | 'history'>('boxes')

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
  const [loadingPrint, setLoadingPrint] = useState<string | null>(null)
  const barcodeRef = useRef<HTMLCanvasElement>(null)

  // --- History tab state ---
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [scanInput, setScanInput] = useState('')
  const [loading, setLoading] = useState(false)


  useEffect(() => { fetchBoxes() }, [lotFilter, stageFilter])
  useEffect(() => { fetchScanHistory() }, [])

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
      setPrintBox(box)
      setPrintBooks(books)
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

  const fetchScanHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/warehouse/scans/recent?limit=50`)
      const data = await res.json()
      if (data.success && data.scans) {
        setLogs(data.scans.map((s: any) => ({
          id: s.id,
          isbn: s.isbn,
          title: s.title || `ISBN: ${s.isbn}`,
          language: s.language || '—',
          scannedAt: new Date(s.scanned_at).toLocaleString(),
          printed: false,
        })))
      }
    } catch (e) {
      console.error('Failed to fetch scan history:', e)
    }
  }

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const isbn = scanInput.trim()
    if (!isbn) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/books/ilms/search/${isbn}`)
      const data = await res.json()
      if (data.success && data.data && !data.data.Message) {
        const d = data.data
        const newLog: LogEntry = {
          id: Date.now().toString(),
          isbn: d.ISBN || isbn,
          title: d.Title || `ISBN: ${isbn}`,
          language: d.LanguageofBook || '—',
          scannedAt: new Date().toLocaleString(),
          printed: false,
        }
        setLogs(prev => [newLog, ...prev])
      } else {
        alert('Book not found in iLMS system')
      }
    } catch (e) {
      alert('Failed to fetch book details')
    } finally {
      setLoading(false)
      setScanInput('')
    }
  }

  useEffect(() => {
    if (printBox && barcodeRef.current) {
      try {
        bwipjs.toCanvas(barcodeRef.current, {
          bcid: 'code128',
          text: printBox.box_number,
          scale: 2,
          height: 12,
          includetext: true,
          textxalign: 'center',
        })
      } catch (e) {
        console.error('Barcode error:', e)
      }
    }
  }, [printBox])

  const filteredBoxes = boxes.filter(b => {
    if (!boxSearch) return true
    const q = boxSearch.toLowerCase()
    return (
      b.box_number?.toLowerCase().includes(q) ||
      b.lot?.lot_number?.toLowerCase().includes(q) ||
      b.current_stage?.toLowerCase().includes(q)
    )
  })

  return (
    <>
    {/* ── PRINT LABEL OVERLAY (print-only) ── */}
    {printBox && (
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-6 print:z-[9999]">
        <div className="max-w-2xl mx-auto">
          {/* Box barcode centered */}
          <div className="flex flex-col items-center mb-4">
            <canvas ref={barcodeRef} />
            <p className="text-xs text-gray-500 mt-1">Box: {printBox.box_number}</p>
          </div>
          {/* Header info */}
          <div className="border border-black p-3 mb-3 grid grid-cols-3 gap-2 text-xs">
            <div><span className="font-bold">Lot:</span> {printBox.lot?.lot_number || '—'}</div>
            <div><span className="font-bold">Box:</span> {printBox.box_number}</div>
            <div><span className="font-bold">Stage:</span> {printBox.current_stage}</div>
            <div><span className="font-bold">Total Books:</span> {printBooks.length || printBox.total_books}</div>
            <div><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</div>
          </div>
          {/* ISBN / Title table */}
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-1 py-0.5 text-left font-bold">#</th>
                <th className="border border-gray-400 px-1 py-0.5 text-left font-bold">ISBN</th>
                <th className="border border-gray-400 px-1 py-0.5 text-left font-bold">Title</th>
                <th className="border border-gray-400 px-1 py-0.5 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {printBooks.length > 0 ? printBooks.map((book, i) => (
                <tr key={book.id || i} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-300 px-1 py-0.5">{i + 1}</td>
                  <td className="border border-gray-300 px-1 py-0.5 font-mono">{book.isbn}</td>
                  <td className="border border-gray-300 px-1 py-0.5">{book.title || '—'}</td>
                  <td className="border border-gray-300 px-1 py-0.5 capitalize">{book.scan_status || '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-2 py-2 text-center text-gray-400 italic">No book records in database for this box</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

    <div className="flex min-h-screen bg-background print:hidden">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">

          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">Browse all boxes and scan history</p>
          </header>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            <button
              onClick={() => setActiveTab('boxes')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'boxes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Package className="h-4 w-4" /> Boxes
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <History className="h-4 w-4" /> Scan History
            </button>
          </div>

          {/* ── BOXES TAB ── */}
          {activeTab === 'boxes' && (
            <div className="flex flex-col gap-4">

              {/* Box Barcode Scanner */}
              <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                <label className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2 mb-2">
                  <Barcode className="h-4 w-4" /> Scan Box Barcode
                </label>
                <input
                  type="text"
                  value={boxScanInput}
                  onChange={e => { setBoxScanInput(e.target.value); setBoxScanNotFound(false) }}
                  onKeyDown={handleBoxScan}
                  placeholder="Scan or type box number and press Enter..."
                  className="w-full px-4 py-3 text-base border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoFocus
                />
                {boxScanNotFound && (
                  <p className="text-xs text-destructive mt-2">Box not found. Check the box number and try again.</p>
                )}
                {boxScanResult && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-700">
                    <Package className="h-3.5 w-3.5" />
                    <span className="font-semibold">{boxScanResult.box_number}</span>
                    <span className="text-muted-foreground">— {boxScanResult.lot?.lot_number} · {boxScanResult.current_stage} · {boxScanResult.total_books} books</span>
                    <button onClick={() => { setBoxScanResult(null); setBoxScanInput(''); setBoxSearch('') }} className="ml-auto text-muted-foreground hover:text-foreground">✕ Clear</button>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search box number, lot..."
                    value={boxSearch}
                    onChange={e => setBoxSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <select
                  value={lotFilter}
                  onChange={e => setLotFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">All Lots</option>
                  {(() => {
                    const fromBoxes = Array.from(new Set(boxes.map(b => b.lot?.lot_number).filter(Boolean))).sort()
                    const opts = fromBoxes.length > 0 ? fromBoxes : LOT_OPTIONS
                    return opts.map(l => <option key={l} value={l}>{l}</option>)
                  })()}
                </select>
                <select
                  value={stageFilter}
                  onChange={e => setStageFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">All Stages</option>
                  {[['warehouse','Warehouse'],['inventory','Inventory'],['cut','Cut'],['qc','QC'],['scan','Scan'],['qa','QA'],['transmit','Transmit'],['storage','Storage']].map(([val,label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Count */}
              <p className="text-xs text-muted-foreground">{filteredBoxes.length} box{filteredBoxes.length !== 1 ? 'es' : ''} found</p>

              {/* Box List */}
              {loadingBoxes ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Loading boxes...</div>
              ) : filteredBoxes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No boxes found</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredBoxes.map(box => {
                    const isOpen = expandedBox === box.id
                    const books = boxBooks[box.id]
                    const rawScans = box.scans as any[]
                    const bookCount = (() => {
                      if (Array.isArray(rawScans) && rawScans.length > 0) {
                        const first = rawScans[0]
                        if (typeof first?.count !== 'undefined') return parseInt(first.count) || 0
                      }
                      return box.total_books || 0
                    })()

                    return (
                      <div key={box.id} className="border border-border rounded-lg overflow-hidden bg-card">
                        {/* Box Header Row */}
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleBox(box.id)}
                            className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            <Package className="h-4 w-4 shrink-0 text-primary" />
                            <span className="font-semibold text-sm text-foreground flex-1">{box.box_number}</span>
                            <span className="text-xs text-muted-foreground mr-2">{box.lot?.lot_number || '—'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STAGE_COLORS[box.current_stage] || 'bg-muted text-muted-foreground'}`}>
                              {box.current_stage}
                            </span>
                            <span className="text-xs text-muted-foreground ml-3 shrink-0">
                              <BookOpen className="inline h-3 w-3 mr-1" />{bookCount} books
                            </span>
                          </button>
                          <button
                            onClick={() => { handlePrintLabel(box).then(() => setTimeout(() => window.print(), 300)) }}
                            disabled={loadingPrint === box.id}
                            className="px-3 py-3 text-muted-foreground hover:text-primary hover:bg-muted/40 transition-colors shrink-0 border-l border-border"
                            title="Print box label"
                          >
                            {loadingPrint === box.id
                              ? <span className="text-[10px]">...</span>
                              : <Printer className="h-4 w-4" />}
                          </button>
                        </div>

                        {/* Expanded Books */}
                        {isOpen && (
                          <div className="border-t border-border bg-muted/20 px-4 py-3">
                            {loadingBooks === box.id ? (
                              <p className="text-xs text-muted-foreground py-2">Loading books...</p>
                            ) : books && books.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground border-b border-border">
                                      <th className="pb-2 text-left font-medium pr-4">ISBN</th>
                                      <th className="pb-2 text-left font-medium pr-4">Title</th>
                                      <th className="pb-2 text-left font-medium pr-4">Status</th>
                                      <th className="pb-2 text-left font-medium">Scanned At</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {books.map((book, i) => (
                                      <tr key={book.id || i} className="border-b border-border/50 last:border-0">
                                        <td className="py-1.5 pr-4 font-mono text-foreground">{book.isbn}</td>
                                        <td className="py-1.5 pr-4 text-foreground max-w-[200px] truncate">{book.title || '—'}</td>
                                        <td className="py-1.5 pr-4">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${book.scan_status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {book.scan_status || '—'}
                                          </span>
                                        </td>
                                        <td className="py-1.5 text-xs text-muted-foreground">
                                          {book.scanned_at ? new Date(book.scanned_at).toLocaleString() : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground py-2">No books logged in this box yet.</p>
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

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {/* Scanner Input */}
              <div className="border-2 border-primary rounded-lg p-6">
                <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Barcode className="h-5 w-5 text-primary" />
                  Scan ISBN / Barcode
                </label>
                <input
                  type="text"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={handleScan}
                  placeholder={loading ? 'Searching...' : 'Scan or type ISBN and press Enter...'}
                  disabled={loading}
                  className="w-full px-4 py-3 text-base border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-2">Press Enter after scanning to look up in iLMS</p>
              </div>

              {/* Log Table */}
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Scan History</h2>
                  <span className="text-xs text-muted-foreground">{logs.length} entries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wide">ISBN</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wide">Title</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wide">Language</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wide">Scanned At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? logs.map(log => (
                        <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{log.isbn}</td>
                          <td className="px-4 py-3 text-foreground max-w-xs truncate">{log.title}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{log.language}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{log.scannedAt}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">No scans yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      {/* Scanned Box Contents Modal */}
      {(scannedBoxModal || loadingScannedBox) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setScannedBoxModal(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground font-mono">{scannedBoxModal?.box.box_number}</h3>
                <p className="text-xs text-muted-foreground">
                  {scannedBoxModal?.box.lot?.lot_number} · <span className="capitalize">{scannedBoxModal?.box.current_stage}</span> · {scannedBoxModal?.box.total_books} books
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
                        <td className="py-1.5 font-mono pr-3">{book.isbn}</td>
                        <td className="py-1.5 pr-3 max-w-[260px] truncate text-foreground">{book.title || '—'}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                            book.scan_status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>{book.scan_status}</span>
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
