'use client'

import { BookOpen, ScanBarcode, CircleCheck, CircleX, Trash2 } from 'lucide-react'
import type { ScannedBook } from '../types/warehouse.types'
import { issueLabel } from '../utils/warehouse.helpers'

interface WarehouseScanLogProps {
  scannedBooks: ScannedBook[]
  openFlagModal: (book: ScannedBook) => void
  handleRemoveBook: (bookId: string) => void
}

export function WarehouseScanLog({ scannedBooks, openFlagModal, handleRemoveBook }: WarehouseScanLogProps) {
  return (
    <div className="bg-card border border-primary/30 rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/10">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-primary">Scan Log</h3>
          {scannedBooks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-600">{scannedBooks.length}</span>
          )}
        </div>
        {scannedBooks.length > 0 && (
          <p className="text-[11px] text-muted-foreground">Most recent on top</p>
        )}
      </div>
      {scannedBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center min-h-[240px] py-12">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <ScanBarcode className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Awaiting scan</p>
            <p className="text-xs text-muted-foreground">Scan a book barcode to add it here.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {/* Scan log table — horizontally scrollable on mobile */}
          <div className="overflow-x-auto">
            {/* Header row */}
            <div className="flex gap-2 px-3 sm:px-5 py-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 min-w-[480px]">
              <div className="w-[110px] shrink-0">ISBN</div>
              <div className="flex-1 min-w-0">Title</div>
              <div className="w-[140px] sm:w-[160px] shrink-0 text-center">Status</div>
              <div className="w-[60px] sm:w-[80px] shrink-0 text-right">Remove</div>
            </div>
            {/* Scan log entries */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {scannedBooks.map((book, idx) => (
                <div
                  key={`${book.id}-${idx}`}
                  className={`flex gap-2 px-3 sm:px-5 py-3 items-center transition-colors hover:bg-muted/30 min-w-[480px] ${
                    book.scan_status === 'non_processable' ? 'bg-destructive/5' : ''
                  }`}
                >
                  <div className="w-[110px] shrink-0">
                    <p className="text-[11px] sm:text-xs font-mono text-foreground">{book.isbn}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] sm:text-xs text-foreground font-medium truncate leading-snug">{book.title}</p>
                    {book.flag_issue && (
                      <p className="text-[10px] text-destructive mt-0.5 truncate">{issueLabel(book.flag_issue)}{book.flag_remarks ? ` — ${book.flag_remarks}` : ''}</p>
                    )}
                  </div>
                  <div className="w-[140px] sm:w-[160px] shrink-0 flex items-center justify-center gap-1 sm:gap-2">
                    {book.scan_status === 'processable' ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">
                          <CircleCheck className="h-3 w-3" />
                          Processable
                        </span>
                        <button
                          onClick={() => openFlagModal(book)}
                          className="text-[10px] text-muted-foreground hover:text-destructive underline transition-colors"
                        >
                          Flag
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 whitespace-nowrap">
                        <CircleX className="h-3 w-3" />
                        Non-Processable
                      </span>
                    )}
                  </div>
                  <div className="w-[60px] sm:w-[80px] shrink-0 flex items-center justify-end gap-1 sm:gap-2">
                    <p className="hidden sm:block text-[10px] text-muted-foreground mt-0.5">
                      {new Date(book.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                    <button
                      onClick={() => handleRemoveBook(book.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove from scan log"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
