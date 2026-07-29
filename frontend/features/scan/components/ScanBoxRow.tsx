import { ChevronDown, ChevronRight, Inbox, Loader2, Package } from 'lucide-react'
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
}

export function ScanBoxRow({
  box,
  expanded,
  onToggle,
  books,
  loadingBooks,
  receivingBox,
  onOpenConfirm,
}: ScanBoxRowProps) {
  const bookCount = formatBookCount(box)

  return (
    <div
      className={cn(
        'group rounded-2xl shadow-sm transition-all',
        expanded
          ? 'premium-gradient-ui-card--solid premium-gradient-ui-card--static'
          : 'bg-white/80 ring-1 ring-black/5 hover:bg-white'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggle}
            className={cn('shrink-0 transition-colors', expanded ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground')}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', expanded ? 'bg-white/20 text-white' : 'bg-primary/10 ring-1 ring-primary/20 text-primary')}>
            <Package className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn('text-[13px] font-bold', expanded ? 'text-white' : 'text-foreground')}>BOX {box.box_number}</p>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', expanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary')}>
                Sent from Endorsement
              </span>
            </div>
            <p className={cn('text-[11px] font-medium', expanded ? 'text-white/80' : 'text-muted-foreground')}>
              {box.lot?.lot_number || '—'} · {bookCount} books
            </p>
          </div>
        </div>
        {(box.box_sessions?.[0]?.endorsement_time_send || box.box_sessions?.[0]?.endorsement_send_profile?.name) && (
          <div className="shrink-0 hidden sm:block text-right mr-2">
            {box.box_sessions?.[0]?.endorsement_send_profile?.name && (
              <p className={cn('text-[11px] font-medium mb-0.5', expanded ? 'text-white/90' : 'text-foreground/80')}>Sent by: {box.box_sessions[0].endorsement_send_profile.name}</p>
            )}
            {box.box_sessions?.[0]?.endorsement_time_send && (
              <>
                <p className={cn('text-xs', expanded ? 'text-white/80' : 'text-muted-foreground')}>{new Date(box.box_sessions[0].endorsement_time_send).toLocaleDateString()}</p>
                <p className={cn('text-[10px]', expanded ? 'text-white/70' : 'text-muted-foreground/80')}>{new Date(box.box_sessions[0].endorsement_time_send).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
              </>
            )}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenConfirm(box) }}
          disabled={receivingBox === box.id}
          className={cn(
            'w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0',
            expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
          )}
        >
          {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
          {receivingBox === box.id ? 'Receiving...' : 'Receive Box'}
        </button>
      </div>
      {expanded && (
        <div className="bg-white p-0">
          <ScanBoxBooks books={books} loading={loadingBooks} />
        </div>
      )}
    </div>
  )
}
