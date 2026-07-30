import { AlertTriangle, ClipboardCheck, Loader2, Package, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { issueLabel } from '../utils/inventory.helpers'
import type { useVerificationSession } from '../hooks/useVerificationSession'

export function InventoryVerificationTables({ verification }: { verification: ReturnType<typeof useVerificationSession> }) {
  const {
    loadingWarehouseBooks,
    warehouseBooks,
    verifScannedBooks,
    openVerifFlagModal,
    handleRemoveVerifBook,
  } = verification

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
      {/* Warehouse Table (Left) - Read Only */}
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-primary">Warehouse Scans</h3>
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
          <p className="text-sm text-muted-foreground py-6 text-center">No warehouse scans found for this box.</p>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border mb-2 shrink-0">
              <div className="col-span-3 sm:col-span-2">ISBN</div>
              <div className="col-span-5 sm:col-span-6">Book Title</div>
              <div className="col-span-4 sm:col-span-4 text-right pr-[56px]">Status</div>
            </div>
            <div className="space-y-1.5 overflow-y-auto overflow-x-hidden max-h-[240px] pr-1.5 custom-scrollbar">
              {warehouseBooks
                .map((book) => {
                  const inventoryBook = verifScannedBooks.find((ib) => ib.isbn === book.isbn)
                  const isMissing = book.rejection_reason === 'missing'
                  const isMatch = isMissing || (inventoryBook && inventoryBook.scan_status === book.scan_status)
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
                    className={cn(
                      'grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center',
                      isMissing ? 'bg-gray-100 border-gray-300 opacity-60' : isMatch ? 'border-primary/20 bg-gradient-to-br from-primary/5 via-white/50 to-primary/10 shadow-sm shadow-primary/5' : 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-red-50 shadow-sm shadow-rose-950/5'
                    )}
                  >
                    <div className="col-span-3 sm:col-span-2 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{book.isbn}</p>
                    </div>
                    <div className="col-span-5 sm:col-span-6 min-w-0">
                      <p className="text-[11px] text-foreground truncate">{book.title}</p>
                    </div>
                    <div className="col-span-4 sm:col-span-4 flex items-center justify-end min-w-0">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap',
                        book.scan_status === 'processable' ? 'border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-emerald-100 text-emerald-700 shadow-sm shadow-emerald-950/5' : 'border border-rose-200 bg-gradient-to-br from-rose-50 via-rose-100/50 to-rose-100 text-rose-700 shadow-sm shadow-rose-950/5'
                      )}>
                        {book.scan_status === 'processable'
                          ? 'Processable'
                          : (book.rejection_reason === 'missing' || book.rejection_reason === 'extra')
                            ? `Non-Processable (${book.rejection_reason.charAt(0).toUpperCase() + book.rejection_reason.slice(1)})`
                            : 'Non-Processable'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Inventory Table (Right) - Editable */}
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 border-primary rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-primary">Inventory Scans</h3>
            <span className="text-xs text-muted-foreground">({verifScannedBooks.length} books)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-primary/20 text-primary border-primary/30">Currently Verifying</span>
        </div>
        {verifScannedBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No books scanned yet.</p>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border mb-2 shrink-0">
              <div className="col-span-3 sm:col-span-2">ISBN</div>
              <div className="col-span-4 sm:col-span-5">Book Title</div>
              <div className="col-span-4 sm:col-span-4 text-right pr-[90px]">Status</div>
              <div className="col-span-1 text-right"></div>
            </div>
            <div className="space-y-1.5 overflow-y-auto overflow-x-hidden max-h-[240px] pr-1.5 custom-scrollbar">
              {verifScannedBooks
                .map((book) => {
                  const warehouseBook = warehouseBooks.find((wb) => wb.isbn === book.isbn)
                  const isMatch = warehouseBook && warehouseBook.scan_status === book.scan_status
                  return { book, isMatch }
                })
                .sort((a, b) => b.book.timestamp.getTime() - a.book.timestamp.getTime())
                .map(({ book, isMatch }, i) => (
                  <div
                    key={`${book.id}-${i}`}
                    className={cn(
                      'grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors items-center',
                      isMatch ? 'border-primary/20 bg-gradient-to-br from-primary/5 via-white/50 to-primary/10 shadow-sm shadow-primary/5' : 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-red-50 shadow-sm shadow-rose-950/5'
                    )}
                  >
                    <div className="col-span-3 sm:col-span-2 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground truncate">{book.isbn}</p>
                    </div>
                    <div className="col-span-4 sm:col-span-5 min-w-0">
                      <p className="text-[11px] text-foreground truncate">{book.title}</p>
                      {book.flag_issue && (
                        <p className="text-[10px] text-red-600 mt-0.5 truncate">
                          {issueLabel(book.flag_issue)}
                          {book.flag_remarks ? ` — ${book.flag_remarks}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="col-span-4 sm:col-span-4 flex items-center justify-end gap-1.5 min-w-0">
                      {book.scan_status === 'processable' ? (
                        <>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-emerald-100 text-emerald-700 shadow-sm shadow-emerald-950/5 whitespace-nowrap">Processable</span>
                          <button
                            onClick={() => openVerifFlagModal(book)}
                            className="rounded-lg border border-rose-200/80 bg-white/75 px-2 py-1 text-[10px] font-semibold text-rose-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:shadow-rose-200/40 whitespace-nowrap"
                          >
                            Flag
                          </button>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-rose-200 bg-gradient-to-br from-rose-50 via-rose-100/50 to-rose-100 text-rose-700 shadow-sm shadow-rose-950/5 whitespace-nowrap">
                          <AlertTriangle className="h-2.5 w-2.5" /> Non-Processable
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={() => handleRemoveVerifBook(book.id)}
                        className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Remove from verification log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
