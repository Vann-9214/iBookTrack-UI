import { cn } from '@/lib/utils'
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
        'items-center px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-black/5',
        isMobile ? 'grid grid-cols-[1fr_80px_120px]' : 'grid grid-cols-[1fr_80px_120px_48px_40px]'
      )}>
        <span>ISBN / Title</span>
        <span>Type</span>
        <span>Status</span>
        <span className="text-center">Print</span>
        <span>{/* Printed */}</span>
      </div>
      {books.map((book) => {
        const isBookPrinted = (actions.printedBookSlips[box.id] ?? new Set<string>()).has(book.id)
        const typeKey = (book.book_type || box.lot?.type || '')
        const typeText = typeKey ? typeKey.charAt(0).toUpperCase() + typeKey.slice(1).toLowerCase() : '—'
        return (
          <div key={book.id} className={cn(
            'items-center px-4 py-2 hover:bg-primary/5 transition-colors',
            isMobile ? 'grid grid-cols-[1fr_80px_120px]' : 'grid grid-cols-[1fr_80px_120px_48px_40px]'
          )}>
            <div className="min-w-0 pr-3">
              <p className="text-xs font-semibold text-foreground truncate">{book.isbn}</p>
              {book.title && <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>}
            </div>
            <span className="text-xs font-medium text-primary">
              {typeText}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap w-fit',
                book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
              </span>
              {book.scan_status === 'non_processable' && book.flag?.issue && book.flag.issue !== 'non-processable' && book.flag.issue !== 'non_processable' && (
                <span className="text-[9px] font-semibold text-red-500/80 leading-none capitalize">{book.flag.issue}</span>
              )}
            </div>
            {!isMobile && (
              <div className="flex items-center justify-center">
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
              <div className="flex items-center justify-center">
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
