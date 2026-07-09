'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const QrScanner = dynamic(() => import('@/components/QrScanner').then(mod => mod.QrScanner), { ssr: false })

import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'
import { ArrowLeft, ScanLine, X } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// ── QR data model ────────────────────────────────────────────────────────────
// Format: LOT:lot 5|BOX:1/11|TYPE:Mustang|BOOKS:isbn1=P;isbn2=NP
interface BookEntry {
  no: number
  isbn: string
  title: string
  status: 'P' | 'NP' | string
}

interface ParsedQr {
  lot: string
  box: string
  bookCount: number
  type: string
  books: BookEntry[]
}

function parseQrData(raw: string): ParsedQr {
  const fields: Record<string, string> = {}
  raw.split('|').forEach((segment) => {
    const idx = segment.indexOf(':')
    if (idx === -1) return
    fields[segment.slice(0, idx).trim().toUpperCase()] = segment.slice(idx + 1).trim()
  })

  const books: BookEntry[] = (fields['BOOKS'] ?? '')
    .split(';')
    .filter(Boolean)
    .map((entry, i) => {
      const eqIdx = entry.indexOf('=')
      const isbn = eqIdx === -1 ? entry : entry.slice(0, eqIdx)
      const status = eqIdx === -1 ? '' : entry.slice(eqIdx + 1)
      return { no: i + 1, isbn, title: '—', status }
    })

  return {
    lot:       fields['LOT']  ?? '—',
    box:       fields['BOX']  ?? '—',
    bookCount: books.length,
    type:      fields['TYPE'] ?? '—',
    books,
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isPass = status === 'P'
  return (
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
  )
}

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

function ScanResultCard({
  scan,
  index,
  total,
  onRemove,
}: {
  scan: { id: number; data: ParsedQr }
  index: number
  total: number
  onRemove: () => void
}) {
  const { data } = scan
  const isLatest = index === 0

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          Scan #{total - index}
          {isLatest && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
              Latest
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground transition"
          aria-label="Remove scan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Section 1 — LOT / BOX / NO. OF BOOKS / TYPE summary */}
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
              <BodyCell>{data.lot}</BodyCell>
              <BodyCell>{data.box}</BodyCell>
              <BodyCell>{data.bookCount}</BodyCell>
              <BodyCell>{data.type}</BodyCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Section 2 — BOOK DETAILS */}
      {data.books.length > 0 && (
        <>
          <div className="text-center py-2 border-y border-border bg-green-50">
            <span className="text-xs font-bold text-green-800 uppercase tracking-wide">Book Details</span>
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
                {data.books.map((book) => (
                  <TableRow key={book.isbn} className="hover:bg-muted/30">
                    <BodyCell>{book.no}</BodyCell>
                    <BodyCell className="font-mono whitespace-nowrap">{book.isbn}</BodyCell>
                    <BodyCell>
                      <span className="block max-w-[120px] truncate" title={book.title}>
                        {book.title}
                      </span>
                    </BodyCell>
                    <BodyCell>
                      {book.status ? <StatusBadge status={book.status} /> : <span className="text-xs text-muted-foreground">—</span>}
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ScanQrPage() {
  const router = useRouter()
  const { colors } = useBrand()
  const [scanHistory, setScanHistory] = useState<{ id: number; data: ParsedQr }[]>([])
  const [nextId, setNextId] = useState(1)

  const handleScan = (text: string) => {
    const data = parseQrData(text)
    setScanHistory((prev) => [{ id: nextId, data }, ...prev])
    setNextId((n) => n + 1)
    toast.success('QR code scanned', { description: `Box ${data.box} · Lot ${data.lot}` })
  }

  const removeScan = (id: number) => setScanHistory((prev) => prev.filter((s) => s.id !== id))

  return (
    // Full-screen, no sidebar, no top navbar / brand toggle — clean mobile scanner view
    <div className="flex flex-col h-screen overflow-hidden bg-background">

      {/* Minimal header bar */}
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
        <h1 className="text-base font-semibold text-foreground">QR Scanner</h1>
      </div>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Scanner card */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Point your camera at a QR code to scan it.
          </p>
          <QrScanner onScan={handleScan} accentColor={colors.accent} />
        </div>

        {/* Scan history */}
        {scanHistory.map((scan, idx) => (
          <ScanResultCard
            key={scan.id}
            scan={scan}
            index={idx}
            total={scanHistory.length}
            onRemove={() => removeScan(scan.id)}
          />
        ))}
      </main>
    </div>
  )
}
