import { ChevronRight, Inbox, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/use-user'
import { BookInBox, BoxEntry } from '../types/cut.types'
import { getBoxBookCount } from '../utils/cut.helpers'
import { CutBoxBooks } from './CutBoxBooks'

interface CutBoxRowProps {
  box: BoxEntry
  type: 'incoming' | 'outgoing'
  isExpanded: boolean
  onToggle: () => void
  onActionClick: (action: 'receive' | 'send', box: BoxEntry) => void
  isProcessing: boolean
  books: BookInBox[]
  isLoadingBooks: boolean
  sender?: string | null
  completedBy?: string | null
  receivedBy?: string | null
  absoluteIndex?: number
}

export function CutBoxRow({
  box,
  type,
  isExpanded,
  onToggle,
  onActionClick,
  isProcessing,
  books,
  isLoadingBooks,
  sender,
  completedBy,
  receivedBy,
  absoluteIndex,
}: CutBoxRowProps) {
  const bookCount = getBoxBookCount(box)
  const isIncoming = type === 'incoming'
  const timeStamp = isIncoming
    ? box.box_sessions?.[0]?.inventory_time_send
    : box.box_sessions?.[0]?.cut_time_received
  const date = timeStamp ? new Date(timeStamp) : null

  const { user } = useUser()
  const canAction = user?.role === 'supervisor' || user?.role === 'cut'

  const badge = (
    <span
      className={cn(
        'hidden lg:inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
        isExpanded ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
      )}
    >
      {isIncoming ? 'Sent from Inventory' : 'Ready to Send'}
    </span>
  )

  const actionButton = canAction ? (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onActionClick(isIncoming ? 'receive' : 'send', box)
      }}
      disabled={isProcessing}
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 transition-colors shrink-0',
        isExpanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
      )}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isIncoming ? (
        <Inbox className="h-4 w-4" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      {isProcessing
        ? isIncoming
          ? 'Receiving...'
          : 'Sending...'
        : isIncoming
          ? 'Receive Box'
          : 'Send to Endorsement'}
    </button>
  ) : null

  return (
    <div className={cn('transition-colors', isExpanded ? 'bg-white/60' : '')}>
      <div
        className={cn(
          'w-full grid grid-cols-12 gap-2 sm:gap-3 items-center px-3 sm:px-4 py-1.5 sm:py-2 text-left transition duration-150 group cursor-pointer',
          isExpanded
            ? 'text-white shadow-lg shadow-black/10 premium-gradient-ui-card--solid'
            : 'hover:bg-primary/5'
        )}
        onClick={onToggle}
      >
        {/* Index */}
        <div className="col-span-1 flex justify-start items-center">
          <span
            className={cn(
              'text-[10px] sm:text-[11px] font-black tabular-nums transition-colors',
              isExpanded ? 'text-white/90' : 'text-primary'
            )}
          >
            {absoluteIndex ? `#${absoluteIndex}` : ''}
          </span>
        </div>

        {/* Box Name / Badge */}
        <div className="col-span-3 sm:col-span-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'text-[11px] sm:text-[12px] font-bold truncate block transition-colors',
                isExpanded ? 'text-white' : 'text-gray-800 group-hover:text-black'
              )}
            >
              BOX {box.box_number}
            </span>
            {badge}
          </div>
        </div>

        {/* Details (hidden on mobile) */}
        <div className="hidden sm:flex sm:col-span-3 min-w-0 flex-col justify-center">
          <span
            className={cn(
              'text-[12px] truncate transition-colors font-medium',
              isExpanded ? 'text-white/80' : 'text-muted-foreground'
            )}
          >
            {box.lot?.lot_number || '—'}
          </span>
          {(date || sender || completedBy || receivedBy) && (
            <span className={cn('text-[10px] truncate transition-colors font-medium', isExpanded ? 'text-white/90' : 'text-muted-foreground')}>
              {sender && `by ${sender}`}
              {completedBy && `by ${completedBy}`}
              {receivedBy && `by ${receivedBy}`}
              {date && ` · ${date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
            </span>
          )}
        </div>

        {/* Book count */}
        <div className="col-span-2 sm:col-span-2 flex justify-center">
          <div
            className={cn(
              'text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-colors whitespace-nowrap',
              isExpanded
                ? 'bg-white/20 border-white/20 text-white'
                : 'bg-white/60 text-gray-600 border-black/5 group-hover:text-primary group-hover:border-primary/30'
            )}
          >
            <span>{bookCount}</span><span className="hidden sm:inline">&nbsp;{bookCount === 1 ? 'book' : 'books'}</span>
          </div>
        </div>

        {/* Actions / Expand */}
        <div className="col-span-6 sm:col-span-3 flex justify-end items-center min-h-[32px]">
          {actionButton}
          <div className="flex items-center justify-end shrink-0 ml-1">
            <span
              className={cn(
                'text-[10px] font-medium hidden lg:inline transition-colors',
                isExpanded ? 'text-white/80' : 'text-muted-foreground'
              )}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </span>
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 transition duration-200',
                isExpanded ? 'rotate-90 text-white' : 'text-muted-foreground/60'
              )}
            />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-white/50 border-t border-black/5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-3">
            <CutBoxBooks isLoadingBooks={isLoadingBooks} books={books} box={box} />
          </div>
        </div>
      )}
    </div>
  )
}
