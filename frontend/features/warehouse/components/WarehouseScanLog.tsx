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

export function WarehouseScanLog({ scannedBooks, openFlagModal, handleRemoveBook, brand = 'mustang' }: WarehouseScanLogProps) {
  const isJaguar = brand === 'jaguar'
  
  return (
    <div className="bg-card rounded-2xl border-2 border-primary/30 shadow-sm ring-1 ring-primary/10 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Scan Log</h3>
          {scannedBooks.length > 0 && (
            <span className="min-w-[22px] h-[22px] rounded-full text-[10px] font-bold bg-primary text-primary-foreground flex items-center justify-center px-1.5">
              {scannedBooks.length}
            </span>
          )}
        </div>
        {scannedBooks.length > 0 && (
          <p className="text-[11px] text-muted-foreground font-medium">Most recent on top</p>
        )}
      </div>
      {scannedBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 text-center min-h-[240px] py-12">
          <div className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full text-white shadow-sm",
            isJaguar ? "bg-gradient-to-br from-emerald-400 to-green-600" : "bg-gradient-to-br from-indigo-400 to-blue-600"
          )}>
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
            <div className="flex gap-2 px-4 sm:px-5 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50 min-w-[480px]">
              <div className="w-[110px] shrink-0">ISBN</div>
              <div className="flex-1 min-w-0">Title</div>
              <div className="w-[140px] sm:w-[160px] shrink-0 text-center">Status</div>
              <div className="w-[60px] sm:w-[80px] shrink-0 text-right">Remove</div>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {scannedBooks.map((book, idx) => (
                <div
                  key={`${book.id}-${idx}`}
                  className={cn(
                    "flex gap-2 px-4 sm:px-5 py-3.5 items-center transition-colors min-w-[480px]",
                    idx % 2 === 0 ? "bg-card" : "bg-muted/10",
                    "hover:bg-muted/40",
                    book.scan_status === 'non_processable' && "bg-destructive/5 hover:bg-destructive/10"
                  )}
                >
                  <div className="w-[110px] shrink-0">
                    <p className="text-[11px] sm:text-xs font-mono font-medium text-foreground">{book.isbn}</p>
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[11px] sm:text-xs text-foreground font-semibold truncate leading-snug">{book.title}</p>
                    {book.flag_issue && (
                      <p className="text-[10px] text-destructive mt-1 truncate font-medium">
                        {issueLabel(book.flag_issue)}{book.flag_remarks ? ` — ${book.flag_remarks}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="w-[140px] sm:w-[160px] shrink-0 flex items-center justify-center gap-2 sm:gap-3">
                    {book.scan_status === 'processable' ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">
                          <CircleCheck className="h-3.5 w-3.5" />
                          Processable
                        </span>
                        <button
                          onClick={() => openFlagModal(book)}
                          className="text-[10px] font-medium text-muted-foreground hover:text-destructive underline decoration-muted-foreground/30 hover:decoration-destructive transition-colors"
                        >
                          Flag
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 whitespace-nowrap">
                        <CircleX className="h-3.5 w-3.5" />
                        Non-Processable
                      </span>
                    )}
                  </div>
                  <div className="w-[60px] sm:w-[80px] shrink-0 flex items-center justify-end gap-2 sm:gap-3">
                    <p className="hidden sm:block text-[10px] font-medium text-muted-foreground">
                      {new Date(book.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <button
                      onClick={() => handleRemoveBook(book.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
