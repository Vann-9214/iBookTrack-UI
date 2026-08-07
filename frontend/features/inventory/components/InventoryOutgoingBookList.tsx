import { cn } from '@/lib/utils'
import { BookStatusBadge } from '@/components/book-status-badge'
import { Loader2, Printer } from 'lucide-react'
import type { BookInBox, InventoryBox } from '../types/inventory.types'
import type { useInventoryActions } from '../hooks/useInventoryActions'

export function InventoryOutgoingBookList({
  box,
  books,
  loading,
  isMobile,
  actions,
}: {
  box: InventoryBox
  books: BookInBox[]
  loading?: boolean
  isMobile: boolean
  actions: ReturnType<typeof useInventoryActions>
}) {
  if (loading) {
    return (
      <div className="bg-white p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading books...
      </div>
    )
  }
  if (books.length === 0) {
    return (
      <div className="bg-white p-6 text-center text-sm text-muted-foreground">
        No books found in this box.
      </div>
    )
  }
  return (
    <div className="bg-white divide-y divide-border/60">
      <div className={cn(
        'grid items-center px-4 py-3 mb-2 gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-y border-black/5',
        isMobile ? 'grid-cols-[1fr_120px]' : 'grid-cols-[120px_1fr_200px] lg:grid-cols-[120px_1fr_200px_48px_40px]'
      )}>
        {!isMobile && <span>ISBN</span>}
        <span className={isMobile ? '' : 'pl-6'}>Title {!isMobile && '/ Author'}</span>
        <span>Status</span>
        {!isMobile && <span className="hidden lg:block text-center">Print</span>}
        {!isMobile && <span className="hidden lg:block">{/* Printed */}</span>}
      </div>
      {books.map((book) => {
        const isBookPrinted = (actions.printedBookSlips[box.id] ?? new Set<string>()).has(book.id)
        return (
          <div key={book.id} className={cn(
            'grid items-center px-4 py-1 hover:bg-primary/5 transition-colors gap-2',
            isMobile ? 'grid-cols-[1fr_120px]' : 'grid-cols-[120px_1fr_200px] lg:grid-cols-[120px_1fr_200px_48px_40px]'
          )}>
            {!isMobile && (
              <div className="min-w-0 pr-2">
                <p className="text-[11px] font-medium text-foreground truncate">{book.isbn}</p>
              </div>
            )}
            <div className={cn('min-w-0 pr-2 flex flex-col justify-center', isMobile ? '' : 'pl-6')}>
              <p className="text-[11px] font-semibold text-foreground truncate">{book.title || '—'}</p>
              {!isMobile && <p className="text-[10px] text-muted-foreground truncate">{book.author || '—'}</p>}
            </div>
            <div className="flex items-center justify-start">
              <BookStatusBadge scan_status={book.scan_status} flag={book.flag} className="scale-95 origin-left" />
            </div>
            {!isMobile && (
              <div className="hidden lg:flex items-center justify-center">
                <button
                  onClick={() => actions.handlePrintBookSlip(book, box)}
                  disabled={actions.loadingBookPrint === `${box.id}-${book.id}`}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-md bg-white border border-black/10 text-foreground hover:bg-black/5 disabled:opacity-60 transition-colors"
                >
                  {actions.loadingBookPrint === `${box.id}-${book.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            {!isMobile && (
              <div className="hidden lg:flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={isBookPrinted}
                  readOnly
                  className="h-4 w-4 rounded border-border accent-primary cursor-default"
                  title={isBookPrinted ? 'Slip printed' : 'Not yet printed'}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
