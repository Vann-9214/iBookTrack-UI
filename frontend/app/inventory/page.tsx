'use client'

import { useState, useEffect, useRef } from 'react'
import { authFetch } from '@/lib/auth-api'
import { useBrand } from '@/hooks/use-brand'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/pagination'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Barcode, Package, Search, ChevronDown, ChevronRight, BookOpen, Printer, Zap, CheckCircle2, XCircle, Loader2, AlertTriangle, Trash2 } from 'lucide-react'
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

export default function InventoryPage() {
  const { brand } = useBrand()

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

  const filteredBoxes = boxes.filter(b => {
    if (!boxSearch) return true
    const q = boxSearch.toLowerCase()
    return (
      b.box_number?.toLowerCase().includes(q) ||
      b.lot?.lot_number?.toLowerCase().includes(q) ||
      b.current_stage?.toLowerCase().includes(q)
    )
  })

  // Add pagination for boxes
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14pt', fontWeight: 300 }}>{printBooks.length || printBox.total_books || '—'}</div>
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
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">

          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">Browse all boxes and their contents</p>
          </header>

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
                <Select value={lotFilter || 'all'} onValueChange={v => setLotFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Lots" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lots</SelectItem>
                    {(() => {
                      const fromBoxes = Array.from(new Set(boxes.map(b => b.lot?.lot_number).filter(Boolean))).sort()
                      const opts = fromBoxes.length > 0 ? fromBoxes : LOT_OPTIONS
                      return opts.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)
                    })()}
                  </SelectContent>
                </Select>
                <Select value={stageFilter || 'all'} onValueChange={v => setStageFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {[
                      ['warehouse','Warehouse'],
                      ['inventory','Inventory'],
                      ['cut','Cut'],
                      ['qc','QC'],
                      ['scan','Scan'],
                      ['qa','QA'],
                      ['transmit','Transmit'],
                      ['storage','Storage'],
                    ].map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Count */}
              <p className="text-xs text-muted-foreground">{filteredBoxes.length} box{filteredBoxes.length !== 1 ? 'es' : ''} found</p>

              {/* Box List */}
              {loadingBoxes ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Loading boxes...</div>
              ) : paginatedBoxes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No boxes found</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {paginatedBoxes.map(box => {
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
                          {box.current_stage === 'scan' && (
                            <button
                              onClick={() => handleCheckSimflex(box)}
                              disabled={simflexModal?.box.id === box.id && simflexModal.loading}
                              className="px-3 py-3 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors shrink-0 border-l border-border"
                              title="Check Simflex transmission status"
                            >
                              {simflexModal?.box.id === box.id && simflexModal.loading
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Zap className="h-4 w-4" />}
                            </button>
                          )}
                          {box.current_stage === 'transmit' && (
                            <button
                              onClick={() => handleMoveToStorage(box)}
                              disabled={movingToStorage === box.id}
                              className="px-3 py-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0 border-l border-border"
                              title="Move to Storage"
                            >
                              {movingToStorage === box.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : '→ Storage'}
                            </button>
                          )}
                          <button
                            onClick={() => { handlePrintLabel(box).then(() => setTimeout(() => window.print(), 600)) }}
                            disabled={loadingPrint === box.id}
                            className="px-3 py-3 text-muted-foreground hover:text-primary hover:bg-muted/40 transition-colors shrink-0 border-l border-border"
                            title="Print box label"
                          >
                            {loadingPrint === box.id
                              ? <span className="text-[10px]">...</span>
                              : <Printer className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: box.id, box_number: box.box_number })}
                            className="px-3 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 border-l border-border"
                            title="Delete box"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Expanded Books */}
                        {isOpen && (
                          <div className="border-t border-border bg-muted/20 px-4 py-3">
                            {/* Simflex status fetch button for scan/transmit boxes */}
                            {(box.current_stage === 'scan' || box.current_stage === 'transmit') && books && books.length > 0 && (
                              <div className="flex items-center gap-2 mb-3">
                                <button
                                  onClick={() => fetchSimflexBookStatus(box, books)}
                                  disabled={loadingSimflexStatus === box.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                                >
                                  {loadingSimflexStatus === box.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Zap className="h-3 w-3" />}
                                  {loadingSimflexStatus === box.id ? 'Checking Simflex…' : 'Check Simflex Status'}
                                </button>
                                {simflexBookStatus[box.id] && (
                                  <span className="text-xs text-muted-foreground">
                                    {Object.values(simflexBookStatus[box.id]).filter(s => s === 'COMPLETED').length}
                                    /{books.filter(b => b.scan_status === 'processable').length} transmitted
                                  </span>
                                )}
                              </div>
                            )}
                            {loadingBooks === box.id ? (
                              <p className="text-xs text-muted-foreground py-2">Loading books...</p>
                            ) : books && books.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground border-b border-border">
                                      <th className="pb-2 text-left font-medium pr-4">ISBN</th>
                                      <th className="pb-2 text-left font-medium pr-4">Title</th>
                                      <th className="pb-2 text-left font-medium pr-4">Warehouse</th>
                                      {simflexBookStatus[box.id] && <th className="pb-2 text-left font-medium pr-4">Simflex</th>}
                                      <th className="pb-2 text-left font-medium">Scanned At</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {books.map((book, i) => {
                                      const sfStatus = simflexBookStatus[box.id]?.[book.isbn]
                                      return (
                                        <tr key={book.id || i} className="border-b border-border/50 last:border-0">
                                          <td className="py-1.5 pr-4 text-foreground">{book.isbn}</td>
                                          <td className="py-1.5 pr-4 text-foreground max-w-[200px] truncate">{book.title || '—'}</td>
                                          <td className="py-1.5 pr-4">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : book.scan_status === 'non_processable' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {book.scan_status === 'processable' ? 'Processable' : book.scan_status === 'non_processable' ? 'Non-Processable' : book.scan_status || '—'}
                                            </span>
                                          </td>
                                          {simflexBookStatus[box.id] && (
                                            <td className="py-1.5 pr-4">
                                              {book.scan_status !== 'processable' ? (
                                                <span className="text-[10px] text-muted-foreground">—</span>
                                              ) : sfStatus === 'COMPLETED' ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">✓ Done</span>
                                              ) : sfStatus ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 truncate max-w-[120px] block">{sfStatus}</span>
                                              ) : (
                                                <span className="text-[10px] text-muted-foreground">Not found</span>
                                              )}
                                            </td>
                                          )}
                                          <td className="py-1.5 text-xs text-muted-foreground">
                                            {book.scanned_at ? new Date(book.scanned_at).toLocaleString() : '—'}
                                          </td>
                                        </tr>
                                      )
                                    })}
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

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  pageSize={pagination.pageSize}
                  onPageChange={pagination.goToPage}
                  onPageSizeChange={pagination.setPageSize}
                  canPrevPage={pagination.canPrevPage}
                  canNextPage={pagination.canNextPage}
                />
              )}
            </div>

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
