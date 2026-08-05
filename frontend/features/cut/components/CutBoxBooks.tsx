import { Loader2 } from 'lucide-react'
import { BookStatusBadge } from '@/components/book-status-badge'
import { BookInBox, BoxEntry } from '../types/cut.types'

interface CutBoxBooksProps {
  isLoadingBooks: boolean
  books: BookInBox[]
  box?: BoxEntry
}

export function CutBoxBooks({ isLoadingBooks, books, box }: CutBoxBooksProps) {
  if (isLoadingBooks) {
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
            <BookStatusBadge scan_status={book.scan_status} flag={book.flag} />
          </div>
        )
      })}
    </div>
  )
}
