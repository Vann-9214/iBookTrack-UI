'use client'

import { BookOpen, ScanBarcode, CircleCheck, CircleX, Trash2 } from 'lucide-react'
import type { ScannedBook } from '../types/warehouse.types'
import { issueLabel } from '../utils/warehouse.helpers'
import { cn } from '@/lib/utils'

interface WarehouseScanLogProps {
  scannedBooks: ScannedBook[]
  openFlagModal: (book: ScannedBook) => void
  handleRemoveBook: (bookId: string) => void
  brand?: 'mustang' | 'jaguar'
}

export function WarehouseScanLog({ scannedBooks, openFlagModal, handleRemoveBook }: WarehouseScanLogProps) {
  const cardTheme = 'bg-white/68 border border-primary/15 ring-1 ring-primary/10 rounded-2xl'
  const iconTheme = 'premium-gradient-ui-card--solid'
  const textTheme = 'text-primary'
  const surfaceTheme = 'border-primary/10 bg-white/65'

  return (
    <div className={cn('relative flex flex-col overflow-hidden border-2 shadow-sm ring-1', cardTheme)}>
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl" />
      <div className={cn('relative flex items-center justify-between border-b px-5 py-4', surfaceTheme)}>
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg', iconTheme)}>
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className={cn('text-[15px] font-black tracking-tight', textTheme)}>Scan Log</h3>
            <p className="mt-0.5 text-[11px] font-medium text-primary/80">Books added to this session</p>
          </div>
          {scannedBooks.length > 0 && (
            <span className={cn('flex h-7 min-w-7 items-center justify-center rounded-xl px-2 text-xs font-black text-white shadow-md ring-2 ring-white/60', iconTheme)}>
              {scannedBooks.length}
            </span>
          )}
        </div>
        {scannedBooks.length > 0 && (
          <p className="text-[11px] text-muted-foreground font-medium">Most recent on top</p>
        )}
      </div>
      {scannedBooks.length === 0 ? (
        <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-sm premium-gradient-ui-card--solid">
            <ScanBarcode className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Awaiting scan</p>
            <p className="text-sm text-muted-foreground mt-1">Scan a book barcode to add it here.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          <div className="overflow-x-auto">
            <div className={cn('flex min-w-[520px] gap-2 border-b px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5 sm:text-[11px]', surfaceTheme, 'border-primary/10')}>
              <div className="w-[110px] shrink-0">ISBN</div>
              <div className="min-w-0 flex-1">Title</div>
              <div className="w-[200px] shrink-0 text-center sm:w-[220px]">Status</div>
              <div className="grid w-[90px] shrink-0 grid-cols-[1fr_28px] gap-1.5">
                <span className="text-center">Time</span>
              </div>
              {/* Spacer to compensate for data row scrollbar (6px) + pr-1 (4px) */}
              <div className="w-[10px] shrink-0" />
            </div>
            <div className={cn('divide-y divide-border pr-1 custom-scrollbar', scannedBooks.length > 9 ? 'h-[400px] overflow-y-scroll' : 'max-h-[314px] overflow-y-auto')}>
              {scannedBooks.map((book, idx) => (
                <div
                  key={`${book.id}-${idx}`}
                  className={cn(
                    'flex min-w-[520px] items-center gap-2 px-4 py-2 transition-colors sm:px-5',
                    idx % 2 === 0 ? 'bg-gradient-to-r' : 'bg-gradient-to-l',
                    book.scan_status === 'processable' ? 'from-white/80 via-primary/5 to-primary/10 hover:from-white hover:via-primary/10 hover:to-primary/15' :
                    book.scan_status === 'non_processable' ? 'from-white/80 via-rose-50/35 to-rose-100/50 hover:from-white hover:via-rose-50/60 hover:to-rose-100/70' : 'bg-white/75 hover:bg-primary/5'
                  )}
                >
                  <div className="w-[110px] shrink-0">
                    <p className="text-[11px] sm:text-xs font-mono font-medium text-foreground">{book.isbn}</p>
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[11px] sm:text-xs text-foreground font-semibold truncate leading-snug">{book.title}</p>
                  </div>
                  <div className="flex w-[200px] shrink-0 items-center justify-center gap-2 sm:w-[220px] sm:gap-3">
                    {book.scan_status === 'processable' ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
                          <CircleCheck className="h-3.5 w-3.5" />
                          Processable
                        </span>
                        <button
                          onClick={() => openFlagModal(book)}
                          className="rounded-lg border border-rose-200/80 bg-white/75 px-2 py-1 text-[10px] font-semibold text-rose-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:shadow-rose-200/40"
                        >
                          Flag
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        {book.flag_issue && (
                          <span className="text-center text-[8.5px] font-bold text-destructive/90 max-w-[190px] leading-none mb-0.5">
                            {issueLabel(book.flag_issue)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-1.5 py-[1px] text-[8.5px] font-bold text-destructive whitespace-nowrap uppercase tracking-wider">
                          <CircleX className="h-2.5 w-2.5" />
                          Non-Processable
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="grid w-[90px] shrink-0 grid-cols-[1fr_28px] items-center gap-1.5">
                    <p className="hidden whitespace-nowrap text-center text-[10px] font-medium text-muted-foreground sm:block">
                      {new Date(book.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <button
                      onClick={() => handleRemoveBook(book.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Remove from scan log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
