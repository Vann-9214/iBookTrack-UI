import React from 'react'
import { BookInBox } from '../types/cut.types'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CutBoxBooksProps {
  isLoadingBooks: boolean
  books: BookInBox[]
}

export const CutBoxBooks: React.FC<CutBoxBooksProps> = ({ isLoadingBooks, books }) => {
  return (
    <div className="border-t border-border px-5 py-3 bg-muted/30 max-h-[300px] overflow-y-auto">
      {isLoadingBooks ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
        </div>
      ) : books.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
      ) : (
        <div className="flex flex-col">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {books.length} book{books.length !== 1 ? 's' : ''} in this box
          </p>
          <div className="flex flex-col gap-1 border-l-2 border-primary/30 pl-3">
            {books.map(book => (
              <div key={book.id} className="flex justify-between items-center py-1">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">{book.isbn}</span>
                  {book.title && (
                    <span className="text-[10px] text-muted-foreground break-words whitespace-normal font-sans">
                      {book.title}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  {book.book_type && (
                    <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', book.book_type.toLowerCase() === 'jaguar' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                      {book.book_type.charAt(0).toUpperCase() + book.book_type.slice(1).toLowerCase()}
                    </span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
