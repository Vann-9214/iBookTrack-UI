import { ChevronRight, Inbox, Loader2, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BoxEntry, BookInBox } from '../types/scan.types'
import { formatBookCount } from '../utils/scan.helpers'
import { ScanBoxBooks } from './ScanBoxBooks'

interface ScanBoxRowProps {
  box: BoxEntry
  expanded: boolean
  onToggle: () => void
  books: BookInBox[]
  loadingBooks: boolean
  receivingBox: string | null
  onOpenConfirm: (box: BoxEntry) => void
  absoluteIndex?: number
}

export function ScanBoxRow({
  box,
  expanded,
  onToggle,
  books,
  loadingBooks,
  receivingBox,
  onOpenConfirm,
  absoluteIndex,
}: ScanBoxRowProps) {
  const bookCount = formatBookCount(box)
  const sender = box.box_sessions?.[0]?.endorsement_send_profile?.name ?? null
  const date = box.box_sessions?.[0]?.endorsement_time_send
    ? new Date(box.box_sessions[0].endorsement_time_send)
    : null

  return (
    <div className={cn('transition-colors', expanded ? 'bg-white/60' : '')}>
      <div
        className={cn(
          'w-full grid grid-cols-12 gap-2 sm:gap-3 items-center px-3 sm:px-4 py-1.5 sm:py-2 text-left transition duration-150 group cursor-pointer',
          expanded
            ? 'text-white shadow-lg shadow-black/10 premium-gradient-ui-card--solid'
            : 'hover:bg-primary/5'
        )}
        onClick={onToggle}
      >
        {/* Index */}
        <div className="col-span-1 flex justify-start items-center">
          <span className={cn('text-[10px] sm:text-[11px] font-black tabular-nums transition-colors', expanded ? 'text-white/90' : 'text-primary')}>
            {absoluteIndex ? `#${absoluteIndex}` : ''}
          </span>
        </div>

        {/* Box Name / Badge */}
        <div className="col-span-4 sm:col-span-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('text-[11px] sm:text-[12px] font-bold truncate block transition-colors', expanded ? 'text-white' : 'text-gray-800 group-hover:text-black')}>
              BOX {box.box_number}
            </span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', expanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary')}>
              Sent from Endorsement
            </span>
          </div>
        </div>

        {/* Details (hidden on mobile) */}
        <div className="hidden sm:flex sm:col-span-3 min-w-0 flex-col justify-center">
          <span className={cn('text-[12px] truncate transition-colors font-medium', expanded ? 'text-white/80' : 'text-muted-foreground')}>
            {box.lot?.lot_number || '—'}
          </span>
          {(sender || date) && (
            <span className={cn('text-[10px] truncate transition-colors font-medium', expanded ? 'text-white/90' : 'text-muted-foreground')}>
              {sender && `by ${sender}`}
              {date && ` · ${date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
            </span>
          )}
        </div>

        {/* Book count */}
        <div className="col-span-3 sm:col-span-2 flex justify-center">
          <div className={cn(
            'text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-colors',
            expanded
              ? 'bg-white/20 border-white/20 text-white'
              : 'bg-white/60 text-gray-600 border-black/5 group-hover:text-primary group-hover:border-primary/30'
          )}>
            {bookCount} {bookCount === 1 ? 'book' : 'books'}
          </div>
        </div>

        {/* Actions / Expand */}
        <div className="col-span-4 sm:col-span-3 flex justify-end items-center gap-2 pr-6">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenConfirm(box) }}
            disabled={receivingBox === box.id}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 transition-colors shrink-0',
              expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
            )}
          >
            {receivingBox === box.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Inbox className="h-3.5 w-3.5" />}
            {receivingBox === box.id ? 'Receiving...' : 'Receive'}
          </button>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={cn('text-[10px] font-medium hidden sm:inline transition-colors', expanded ? 'text-white/80' : 'text-muted-foreground')}>
              {expanded ? 'Collapse' : 'Expand'}
            </span>
            <ChevronRight className={cn(
              'h-3.5 w-3.5 transition duration-200',
              expanded ? 'rotate-90 text-white' : 'text-muted-foreground/60'
            )} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-white/50 border-t border-black/5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-3">
            <ScanBoxBooks books={books} loading={loadingBooks} />
          </div>
        </div>
      )}
    </div>
  )
}
