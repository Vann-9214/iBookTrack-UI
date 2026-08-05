import { ChevronDown, ChevronRight, Inbox, Loader2, Package, Send } from 'lucide-react'
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
}: CutBoxRowProps) {
  const bookCount = getBoxBookCount(box)
  const isIncoming = type === 'incoming'
  const timeStamp = isIncoming
    ? box.box_sessions?.[0]?.inventory_time_send
    : box.box_sessions?.[0]?.cut_time_received

  const { user } = useUser()
  const canAction = user?.role === 'supervisor' || user?.role === 'cut'

  return (
    <div
      className={cn(
        'group rounded-2xl shadow-sm transition',
        isExpanded
          ? 'premium-gradient-ui-card--solid premium-gradient-ui-card--static'
          : 'bg-white/80 ring-1 ring-black/5 hover:bg-white'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggle}
            className={cn('shrink-0 transition-colors', isExpanded ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground')}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', isExpanded ? 'bg-white/20 text-white' : 'bg-primary/10 ring-1 ring-primary/20 text-primary')}>
            <Package className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn('text-[13px] font-bold', isExpanded ? 'text-white' : 'text-foreground')}>BOX {box.box_number}</p>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                isExpanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
              )}>
                {isIncoming ? 'Sent from Inventory' : 'Ready to Send'}
              </span>
            </div>
            <p className={cn('text-[11px] font-medium', isExpanded ? 'text-white/80' : 'text-muted-foreground')}>
              {box.lot?.lot_number || '—'} · {bookCount} books
            </p>
          </div>
          {sender && (
            <div className="shrink-0 hidden sm:flex flex-col items-end mr-2">
              <span className={cn('text-[10px] font-semibold uppercase tracking-wider', isExpanded ? 'text-white/60' : 'text-muted-foreground')}>Sent By</span>
              <span className={cn('text-xs font-medium', isExpanded ? 'text-white' : 'text-foreground')}>{sender}</span>
            </div>
          )}
          {completedBy && (
            <div className="shrink-0 hidden sm:flex flex-col items-end mr-2">
              <span className={cn('text-[10px] font-semibold uppercase tracking-wider', isExpanded ? 'text-white/60' : 'text-muted-foreground')}>Completed By</span>
              <span className={cn('text-xs font-medium', isExpanded ? 'text-white' : 'text-foreground')}>{completedBy}</span>
            </div>
          )}
          {receivedBy && (
            <div className="shrink-0 hidden sm:flex flex-col items-end mr-2">
              <span className={cn('text-[10px] font-semibold uppercase tracking-wider', isExpanded ? 'text-white/60' : 'text-muted-foreground')}>Received By</span>
              <span className={cn('text-xs font-medium', isExpanded ? 'text-white' : 'text-foreground')}>{receivedBy}</span>
            </div>
          )}
          {timeStamp && (
            <div className="shrink-0 hidden sm:block text-right mr-2">
              <p className={cn('text-xs', isExpanded ? 'text-white/80' : 'text-muted-foreground')}>{new Date(timeStamp).toLocaleDateString()}</p>
              <p className={cn('text-[10px]', isExpanded ? 'text-white/70' : 'text-muted-foreground/80')}>
                {new Date(timeStamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>

        {canAction && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onActionClick(isIncoming ? 'receive' : 'send', box)
            }}
            disabled={isProcessing}
            className={cn(
              'w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0',
              isExpanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
            )}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : isIncoming ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {isProcessing ? (isIncoming ? 'Receiving...' : 'Sending...') : isIncoming ? 'Receive Box' : 'Send to Endorsement'}
          </button>
        )}
      </div>

      {isExpanded && <CutBoxBooks isLoadingBooks={isLoadingBooks} books={books} box={box} />}
    </div>
  )
}
