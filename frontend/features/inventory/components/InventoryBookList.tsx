import { cn } from '@/lib/utils'
import { BookStatusBadge } from '@/components/book-status-badge'
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
      <div className="grid grid-cols-[1fr_120px] sm:grid-cols-[120px_1fr_200px] gap-2 items-center px-4 py-3 mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-y border-black/5">
        <span className="hidden sm:block">ISBN</span>
        <span className="sm:pl-6">Title <span className="hidden sm:inline">/ Author</span></span>
        <span>Status</span>
      </div>
      {books.map((book) => {
        return (
          <div key={book.id} className="grid grid-cols-[1fr_120px] sm:grid-cols-[120px_1fr_200px] items-center px-4 py-1 hover:bg-primary/5 transition-colors gap-2">
            <div className="min-w-0 pr-2 hidden sm:block">
              <p className="text-[11px] font-medium text-foreground truncate">{book.isbn}</p>
            </div>
            <div className="min-w-0 sm:pl-6 pr-2 flex flex-col justify-center">
              <p className="text-[11px] font-semibold text-foreground truncate">{book.title || '—'}</p>
              <p className="text-[10px] text-muted-foreground truncate hidden sm:block">{book.author || '—'}</p>
            </div>
            <div className="flex items-center justify-start">
              <BookStatusBadge scan_status={book.scan_status} flag={book.flag} showFlag={showFlags} className="scale-95 origin-left" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
