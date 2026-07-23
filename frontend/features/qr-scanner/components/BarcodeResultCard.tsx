import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BarcodeResult } from '../types/qr-scanner.types'
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

export interface BarcodeResultCardProps {
  result: BarcodeResult
  onRemove: () => void
}

export function BarcodeResultCard({ result, onRemove }: BarcodeResultCardProps) {
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
