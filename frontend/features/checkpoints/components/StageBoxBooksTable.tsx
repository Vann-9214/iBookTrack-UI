import { cn } from '@/lib/utils'
import type { ScannedBook, SimflexStatusResult, Stage } from '../types/checkpoints.types'

interface StageBoxBooksTableProps {
  books: ScannedBook[]
  brand: string
  selectedStage: Stage
  simflex: Record<string, SimflexStatusResult>
}

export function StageBoxBooksTable({ books, brand, selectedStage, simflex }: StageBoxBooksTableProps) {
  const typeText = brand ? brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase() : '—'

  return (
    <div className="divide-y divide-border">
      <div className="grid grid-cols-[1fr_140px_120px] items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50">
        <span>ISBN / Title</span>
        <span>Author</span>
        <span>Status</span>
      </div>
      {books.map((book) => {
        const status = book.scan_status
        const isProcessable = status === 'processable'
        const statusLabel = isProcessable ? 'Processable' : status === 'non_processable' ? 'Non-Processable' : status
        const simflexStatus = simflex?.[book.isbn]

        return (
          <div key={book.id} className="grid grid-cols-[1fr_140px_120px] items-center px-4 py-2.5 hover:bg-muted/40 transition-colors">
            <div className="min-w-0 pr-3">
              <p className="text-xs font-semibold text-foreground truncate">{book.isbn}</p>
              {book.title && <p className="text-[11px] text-muted-foreground truncate">{book.title}</p>}
            </div>
            <div className="min-w-0 pr-3">
              <p className="text-[11px] text-muted-foreground truncate">{book.author || '—'}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded font-medium w-fit',
                  isProcessable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                )}
              >
                {statusLabel}
              </span>
              {book.scan_status === 'non_processable' && book.flag?.issue && book.flag.issue !== 'non-processable' && book.flag.issue !== 'non_processable' && (
                <span className="text-[9px] font-semibold text-red-500/80 leading-none capitalize">{book.flag.issue}</span>
              )}
              {isProcessable && simflexStatus && (
                <span className="text-[9px] font-semibold text-blue-500/80 leading-none capitalize mt-0.5">
                  In Simflex: {simflexStatus.latestStatus || 'Pending'}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
