import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QrResult } from '../types/qr-scanner.types'
import { StatusBadge } from './StatusBadge'

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

export interface QrResultCardProps {
  result: QrResult
  onRemove: () => void
}

export function QrResultCard({ result, onRemove }: QrResultCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          Scan Result
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary text-white">
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
                  <HeaderCell>AUTHOR</HeaderCell>
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
                    <BodyCell className="break-words min-w-[80px]">{book.author || '—'}</BodyCell>
                    <BodyCell>
                      {book.status
                        ? <StatusBadge status={book.status} rejectionReason={book.rejectionReason} isResolved={book.isResolved} />
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
