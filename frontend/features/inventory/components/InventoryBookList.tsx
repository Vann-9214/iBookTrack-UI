import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { BookInBox, InventoryBox } from '../types/inventory.types'

export function InventoryBookList({
  books,
  box,
  loading,
  showFlags = true,
}: {
  books: BookInBox[]
  box: InventoryBox
  loading?: boolean
  showFlags?: boolean
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
      <div className="grid grid-cols-[1fr_80px_120px] items-center px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-black/5">
        <span>ISBN / Title</span>
        <span>Type</span>
        <span>Status</span>
      </div>
      {books.map((book) => {
        const typeKey = (book.book_type || box.lot?.type || '')
        const typeText = typeKey ? typeKey.charAt(0).toUpperCase() + typeKey.slice(1).toLowerCase() : '—'
        return (
          <div key={book.id} className="grid grid-cols-[1fr_80px_120px] items-center px-4 py-2 hover:bg-primary/5 transition-colors">
            <div className="min-w-0 pr-3">
              <p className="text-xs font-semibold text-foreground truncate">{book.isbn}</p>
              {book.title && <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>}
            </div>
            <span className="text-xs font-medium text-primary">
              {typeText}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded font-medium w-fit',
                book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
              </span>
              {showFlags && book.scan_status === 'non_processable' && book.flag?.issue && book.flag.issue !== 'non-processable' && book.flag.issue !== 'non_processable' && (
                <span className="text-[9px] font-semibold text-red-500/80 leading-none capitalize">{book.flag.issue}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
