import React from 'react'
import { Package, Loader2, ClipboardCheck, AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WarehouseBook, InspScannedBook } from '../types/endorsement.types'
import { issueLabel } from '../utils/endorsement.helpers'

interface InspectionComparisonTablesProps {
  warehouseBooks: WarehouseBook[]
  loadingWarehouseBooks: boolean
  inspScannedBooks: InspScannedBook[]
  openInspFlagModal: (book: InspScannedBook) => void
  handleRemoveInspBook: (bookId: string) => void
  brand: string
}

export const InspectionComparisonTables: React.FC<InspectionComparisonTablesProps> = ({
  warehouseBooks,
  loadingWarehouseBooks,
  inspScannedBooks,
  openInspFlagModal,
  handleRemoveInspBook,
  brand,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Warehouse Table (Left) - Read Only */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Previous Scans (Inventory)</h3>
          {loadingWarehouseBooks ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <span className="text-xs text-muted-foreground">({warehouseBooks.length} books)</span>
          )}
        </div>

        {loadingWarehouseBooks ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : warehouseBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No previous scans found for this box.</p>
        ) : (
          <div className="overflow-y-auto max-h-96">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
              <div className="col-span-2">ISBN</div>
              <div className="col-span-6">Book Title</div>
              <div className="col-span-3 text-right">Status</div>
              <div className="col-span-1"></div>
            </div>
            <div className="space-y-1.5">
              {warehouseBooks
                .map((book) => {
                  const endorsementBook = inspScannedBooks.find(
                    (ib) => ib.isbn.trim().toLowerCase() === (book.isbn || '').trim().toLowerCase()
                  )
                  const isMissing = book.rejection_reason === 'missing'
                  const isMatch = isMissing || (endorsementBook && endorsementBook.scan_status === book.scan_status)
                  return { book, isMatch, isMissing }
                })
                .sort((a, b) => {
                  if (a.isMissing && !b.isMissing) return 1
                  if (!a.isMissing && b.isMissing) return -1
                  return a.isMatch === b.isMatch ? 0 : a.isMatch ? -1 : 1
                })
                .map(({ book, isMatch, isMissing }, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center ${
                      isMissing ? 'bg-gray-100 border-gray-300 opacity-60' : isMatch ? (brand === 'jaguar' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300') : 'bg-red-100 border-red-300'
                    }`}
                  >
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                    </div>
                    <div className="col-span-6">
                      <p className="text-[11px] text-foreground break-words">{book.title}</p>
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                          book.scan_status === 'processable' ? (brand === 'jaguar' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800') : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {book.scan_status === 'processable'
                          ? 'Processable'
                          : book.rejection_reason === 'missing' || book.rejection_reason === 'extra'
                          ? `Non-Processable (${book.rejection_reason.charAt(0).toUpperCase() + book.rejection_reason.slice(1)})`
                          : 'Non-Processable'}
                      </span>
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Endorsement Table (Right) - Editable */}
      <div className="bg-card border-2 border-primary rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-primary">Endorsement Scans</h3>
            <span className="text-xs text-muted-foreground">({inspScannedBooks.length} books)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
            Currently Endorsing
          </span>
        </div>

        {inspScannedBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No books scanned yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
              <div className="col-span-3">ISBN</div>
              <div className="col-span-5">Book Title</div>
              <div className="col-span-3 text-right">Status</div>
              <div className="col-span-1 text-right"></div>
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {inspScannedBooks
                .map((book) => {
                  const warehouseBook = warehouseBooks.find((wb) => wb.isbn === book.isbn)
                  const isMatch = warehouseBook && warehouseBook.scan_status === book.scan_status
                  return { book, isMatch }
                })
                .sort((a, b) => b.book.timestamp.getTime() - a.book.timestamp.getTime())
                .map(({ book, isMatch }, idx) => (
                  <div
                    key={`${book.id}-${idx}`}
                    className={cn(
                      'grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center',
                      isMatch ? (brand === 'jaguar' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300') : 'bg-red-100 border-red-300'
                    )}
                  >
                    <div className="col-span-3">
                      <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                    </div>
                    <div className="col-span-5">
                      <p className="text-[11px] text-muted-foreground break-words">{book.title}</p>
                      {book.flag_issue && (
                        <p className="text-[10px] text-red-500 mt-0.5">
                          {issueLabel(book.flag_issue)}
                          {book.flag_remarks ? ` — ${book.flag_remarks}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="col-span-3 flex flex-row items-center justify-end gap-2">
                      {book.scan_status === 'processable' ? (
                        <>
                          <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap", brand === 'jaguar' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                            Processable
                          </span>
                          <button
                            onClick={() => openInspFlagModal(book)}
                            className="text-[10px] text-muted-foreground hover:text-destructive underline whitespace-nowrap"
                          >
                            Flag Issue
                          </button>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700 text-right whitespace-nowrap">
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Non-Processable
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={() => handleRemoveInspBook(book.id)}
                        className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
