import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { BookInBox } from '../types/scan.types'

export function ScanBoxBooks({
  books,
  loading,
}: {
  books: BookInBox[]
  loading?: boolean
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
      <div className="grid grid-cols-[1fr_140px_120px] items-center px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-black/5">
        <span>ISBN / Title</span>
        <span>Author</span>
        <span>Status</span>
      </div>
      {books.map((book) => {
        return (
          <div key={book.id} className="grid grid-cols-[1fr_140px_120px] items-center px-4 py-2 hover:bg-primary/5 transition-colors">
            <div className="min-w-0 pr-3">
              <p className="text-xs font-semibold text-foreground truncate">{book.isbn}</p>
              {book.title && <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>}
            </div>
            <div className="min-w-0 pr-3">
              <p className="text-[11px] text-muted-foreground truncate">{book.author || '—'}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded font-medium w-fit',
                book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
