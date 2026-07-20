'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ScanFormat } from '@/components/QrScanner'

const QrScanner = dynamic(() => import('@/components/QrScanner').then(mod => mod.QrScanner), { ssr: false })

import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'
import { ArrowLeft, ScanLine, X, Loader2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { authFetch, getApiBaseUrl } from '@/lib/auth-api'

// ─────────────────────────────────────────────────────────────────────────────
// Data models
// ─────────────────────────────────────────────────────────────────────────────

interface BookEntry {
  no: number
  isbn: string
  title: string
  status: string
  rejectionReason?: string
}

// Result from a QR scan (pipe-delimited box label)
interface QrResult {
  kind: 'qr'
  lot: string
  box: string
  bookCount: number
  type: string
  books: BookEntry[]
}

// Result from a barcode scan (single ISBN)
interface BarcodeResult {
  kind: 'barcode'
  isbn: string
  title: string
  lot: string
  box: string
  bookType: string      // 'Mustang' | 'Jaguar' | '—'
  status: string        // 'P' | 'NP' | ''
  rejectionReason: string
  loading: boolean
  notFound: boolean
}

type ScanResult = QrResult | BarcodeResult

// ─────────────────────────────────────────────────────────────────────────────
// QR parser  —  LOT:lot 5|BOX:1/11|TYPE:Mustang|BOOKS:isbn1=P;isbn2=NP
// ─────────────────────────────────────────────────────────────────────────────
function parseQr(raw: string): QrResult {
  const fields: Record<string, string> = {}
  raw.split('|').forEach((seg) => {
    const i = seg.indexOf(':')
    if (i === -1) return
    fields[seg.slice(0, i).trim().toUpperCase()] = seg.slice(i + 1).trim()
  })

  const books: BookEntry[] = (fields['BOOKS'] ?? '')
    .split(';')
    .filter(Boolean)
    .map((entry, idx) => {
      const eq = entry.indexOf('=')
      return {
        no: idx + 1,
        isbn: eq === -1 ? entry : entry.slice(0, eq),
        title: '—',
        status: eq === -1 ? '' : entry.slice(eq + 1),
      }
    })

  return {
    kind:      'qr',
    lot:       fields['LOT']  ?? '—',
    box:       fields['BOX']  ?? '—',
    bookCount: books.length,
    type:      fields['TYPE'] ?? '—',
    books,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styled cells
// ─────────────────────────────────────────────────────────────────────────────
function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <TableHead className="text-[11px] font-bold text-foreground bg-yellow-200 px-3 py-2 text-center border border-yellow-300">
      {children}
    </TableHead>
  )
}

function BodyCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableCell className={cn('text-xs text-card-foreground px-3 py-2.5 text-center border border-border', className)}>
      {children}
    </TableCell>
  )
}

// Maps raw rejection_reason slugs to readable labels
const REJECTION_LABELS: Record<string, string> = {
  'bleed-through':        'Bleed-through on page',
  'brittle':              'Brittle on page',
  'cannot-detach-sticky': 'Cannot be detached / sticky pages',
  'cd-only':              'CD only, no text content',
  'map-spanning':         'Contains a map spanning the entire book',
  'split-pages':          'Contains split pages',
  'cutoff-text':          'Cutoff text on page',
  'illegible-text':       'Illegible text',
  'inverted-contrast':    'Inverted contrast',
  'missing-pages':        'Missing page/s',
  'no-content':           'No content or body text',
  'obscured-highlight':   'Obscured text (highlight marker)',
  'obscured-watermark':   'Obscured text (watermark)',
  'oversized':            'Oversized',
  'pen-marks':            'Pen marks on page',
  'pop-up-book':          'Pop-up book',
  'postcard-only':        'Postcard only',
  'stained-dirty':        'Stained or dirty page',
  'stamp-mark':           'Stamp mark on page',
  'thick-cardboard':      'Thick / cardboard pages',
  'torn-pages':           'Torn pages',
  'missing':              'Missing',
  'extra':                'Extra',
}

function StatusBadge({ status, rejectionReason }: { status: string; rejectionReason?: string }) {
  const isPass = status === 'P'
  const reasonLabel = rejectionReason
    ? (REJECTION_LABELS[rejectionReason] ?? rejectionReason)
    : null
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] font-normal border whitespace-nowrap',
          isPass
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : 'bg-red-50 text-red-700 border-red-300',
        )}
      >
        {isPass ? 'Processable' : 'Non-Processable'}
      </Badge>
      {!isPass && reasonLabel && (
        <span className="text-[9px] text-red-500 text-center leading-tight max-w-[100px] break-words">
          {reasonLabel}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Barcode result card
// Layout from image:
//   ┌─────────────────────────────────────┐
//   │          TITLE HERE  (dark green)   │
//   │        1234567890123  (large)        │
//   │          TITLE & ISBN  (sub)         │
//   ├──────┬────────┬──────────┬──────────┤  ← yellow header
//   │ LOT  │  BOX   │  TYPE    │  STATUS  │
//   │  1   │123/124 │MUSTANG/… │Processab…│
//   └──────┴────────┴──────────┴──────────┘
// ─────────────────────────────────────────────────────────────────────────────
function BarcodeResultCard({
  result,
  onRemove,
}: {
  result: BarcodeResult
  onRemove: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Dismiss button */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          Scan Result
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
            Latest
          </span>
        </span>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-foreground transition" aria-label="Remove">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Title + ISBN hero block (dark green header) */}
      <div className="bg-green-900 text-white px-4 py-3 text-center space-y-0.5">
        {result.loading ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-green-300" />
            <span className="text-sm text-green-200">Looking up ISBN…</span>
          </div>
        ) : result.notFound ? (
          <p className="text-sm font-semibold text-red-300">ISBN not found in system</p>
        ) : (
          /* Title — wraps naturally, no truncation */
          <p className="text-sm font-bold leading-snug break-words">
            {result.title}
          </p>
        )}
        {/* Separator — emphasises the ISBN number below */}
        <hr className="border-green-700 my-1.5" />
        {/* ISBN — always shown, large mono */}
        <p className="text-lg font-bold font-mono tracking-wide">
          {result.isbn}
        </p>
        <p className="text-[10px] text-green-200 uppercase tracking-widest mt-1">
          Title &amp; ISBN
        </p>
      </div>

      {/* LOT / BOX / TYPE / STATUS table */}
      {!result.loading && (
        <div className="overflow-x-auto">
          <Table className="min-w-full border-collapse">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <HeaderCell>LOT</HeaderCell>
                <HeaderCell>BOX</HeaderCell>
                <HeaderCell>TYPE</HeaderCell>
                <HeaderCell>STATUS</HeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-muted/30">
                <BodyCell>{result.lot}</BodyCell>
                <BodyCell>{result.box}</BodyCell>
                <BodyCell>{result.bookType}</BodyCell>
                <BodyCell>
                  {result.status
                    ? <StatusBadge status={result.status} rejectionReason={result.rejectionReason} />
                    : <span className="text-xs text-muted-foreground">—</span>}
                </BodyCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QR result card  (unchanged layout — box summary + book details)
// Title column: wraps instead of truncating
// ─────────────────────────────────────────────────────────────────────────────
function QrResultCard({
  result,
  onRemove,
}: {
  result: QrResult
  onRemove: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          Scan Result
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
            Latest
          </span>
        </span>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-foreground transition" aria-label="Remove">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* LOT / BOX / NO. OF BOOKS / TYPE */}
      <div className="overflow-x-auto">
        <Table className="min-w-full border-collapse">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <HeaderCell>LOT</HeaderCell>
              <HeaderCell>BOX</HeaderCell>
              <HeaderCell>NO. OF BOOKS</HeaderCell>
              <HeaderCell>TYPE</HeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-muted/30">
              <BodyCell>{result.lot}</BodyCell>
              <BodyCell>{result.box}</BodyCell>
              <BodyCell>{result.bookCount}</BodyCell>
              <BodyCell>{result.type}</BodyCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Book details */}
      {result.books.length > 0 && (
        <>
          <div className="text-center py-2 border border-green-900 bg-green-900/90">
            <span className="text-xs font-bold text-green-100 uppercase tracking-wide">Book Details</span>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-full border-collapse">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <HeaderCell>NO.</HeaderCell>
                  <HeaderCell>ISBN</HeaderCell>
                  <HeaderCell>TITLE</HeaderCell>
                  <HeaderCell>STATUS</HeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.books.map((book) => (
                  <TableRow key={book.isbn} className="hover:bg-muted/30">
                    <BodyCell>{book.no}</BodyCell>
                    {/* Full ISBN — no truncation */}
                    <BodyCell className="font-mono whitespace-nowrap">{book.isbn}</BodyCell>
                    {/* Title wraps to fill available width */}
                    <BodyCell className="break-words min-w-[80px]">{book.title}</BodyCell>
                    <BodyCell>
                      {book.status
                        ? <StatusBadge status={book.status} rejectionReason={book.rejectionReason} />
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </BodyCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ScanQrPage() {
  const router = useRouter()
  const { colors, brand } = useBrand()
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  // Fetch title + location for a single ISBN from the backend
  const fetchIsbnDetails = async (isbn: string) => {
    const res = await authFetch(`${getApiBaseUrl()}/api/warehouse/search/isbn/${isbn}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  const handleScan = async (text: string, format: ScanFormat) => {
    if (format === 'barcode') {
      const isbn = text.replace(/[^0-9a-zA-Z]/g, '')

      // Show card immediately in loading state
      setScanResult({
        kind:            'barcode',
        isbn,
        title:           '—',
        lot:             '—',
        box:             '—',
        bookType:        '—',
        status:          '',
        rejectionReason: '',
        loading:         true,
        notFound:        false,
      })
      toast.success('Barcode scanned', { description: isbn })

      // Fetch details from the backend
      try {
        const json = await fetchIsbnDetails(isbn)

        if (json.success && json.book) {
          const b = json.book
          // scan_status is now included directly in json.book (sourced from book_activity)
          const rawStatus = b.scan_status ?? ''
          const status = rawStatus === 'processable' ? 'P' : rawStatus === 'non_processable' ? 'NP' : ''
          setScanResult({
            kind:            'barcode',
            isbn,
            title:           b.title && b.title !== 'Unknown' ? b.title : '—',
            lot:             b.lot_number || '—',
            box:             b.box_number || '—',
            bookType:        b.book_type || '—',
            status,
            rejectionReason: b.rejection_reason || '',
            loading:         false,
            notFound:        false,
          })
        } else {
          setScanResult((prev) => prev?.kind === 'barcode'
            ? { ...prev, loading: false, notFound: true }
            : prev)
          toast.error('ISBN not found', { description: json.message || isbn })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setScanResult((prev) => prev?.kind === 'barcode'
          ? { ...prev, loading: false, notFound: true }
          : prev)
        toast.error('Lookup failed', { description: msg })
      }
    } else {
      // QR = pipe-delimited box label — show immediately, then fill titles in background
      const data = parseQr(text)
      setScanResult(data)
      toast.success('QR code scanned', { description: `Box ${data.box} · Lot ${data.lot}` })

      // Fetch titles for every ISBN in the QR in parallel
      if (data.books.length > 0) {
        const results = await Promise.allSettled(
          data.books.map((book) => fetchIsbnDetails(book.isbn))
        )
        setScanResult((prev) => {
          if (!prev || prev.kind !== 'qr') return prev
          const updatedBooks = prev.books.map((book, i) => {
            const res = results[i]
            if (res.status === 'fulfilled' && res.value?.success && res.value?.book) {
              const b = res.value.book
              return {
                ...book,
                title:           b.title && b.title !== 'Unknown' ? b.title : '—',
                rejectionReason: b.rejection_reason || '',
              }
            }
            return book
          })
          return { ...prev, books: updatedBooks }
        })
      }
    }
  }

  return (
    <div className={cn("flex flex-col h-screen overflow-hidden bg-background", `theme-${brand}`)}>

      {/* Minimal header — no navbar, no brand toggle */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background hover:bg-muted transition shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <ScanLine className="w-5 h-5 shrink-0" style={{ color: colors.accent }} />
        <h1 className="text-base font-semibold text-foreground">QR / Barcode Scanner</h1>
      </div>

      <main className="ambient-bg flex-1 overflow-y-auto p-4 space-y-4">

        {/* Scanner */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Point your camera at a QR code or barcode to scan it.
          </p>
          <QrScanner onScan={handleScan} accentColor={colors.accent} />
        </div>

        {/* Result — one card, replaced on every new scan */}
        {scanResult && (
          scanResult.kind === 'barcode'
            ? <BarcodeResultCard result={scanResult} onRemove={() => setScanResult(null)} />
            : <QrResultCard result={scanResult} onRemove={() => setScanResult(null)} />
        )}
      </main>
    </div>
  )
}
