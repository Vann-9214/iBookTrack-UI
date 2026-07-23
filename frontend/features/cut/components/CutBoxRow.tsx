import React from 'react'
import { BookOpen, ChevronDown, ChevronRight, Inbox, Loader2, Package, Send } from 'lucide-react'
import { BookInBox, BoxEntry } from '../types/cut.types'
import { getBoxBookCount } from '../utils/cut.helpers'
import { CutBoxBooks } from './CutBoxBooks'
import { useUser } from '@/hooks/use-user'

interface CutBoxRowProps {
  box: BoxEntry
  type: 'incoming' | 'outgoing'
  isExpanded: boolean
  onToggle: () => void
  onActionClick: (action: 'receive' | 'send', box: BoxEntry) => void
  isProcessing: boolean
  books: BookInBox[]
  isLoadingBooks: boolean
}

export const CutBoxRow: React.FC<CutBoxRowProps> = ({
  box,
  type,
  isExpanded,
  onToggle,
  onActionClick,
  isProcessing,
  books,
  isLoadingBooks,
}) => {
  const bookCount = getBoxBookCount(box)
  const isIncoming = type === 'incoming'
  const timeStamp = isIncoming
    ? box.box_sessions?.[0]?.inventory_time_send
    : box.box_sessions?.[0]?.cut_time_received

  const { user } = useUser()
  const canAction = user?.role === 'supervisor' || user?.role === 'cut'

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
        {/* Top row: chevron + icon + info + date */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggle}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="bg-primary/10 rounded-lg p-2 shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                {isIncoming ? 'Sent from Inventory' : 'Ready to Send'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" />
            </p>
          </div>
          {timeStamp && (
            <div className="shrink-0 hidden sm:block text-right mr-2">
              <p className="text-xs text-muted-foreground">{new Date(timeStamp).toLocaleDateString()}</p>
              <p className="text-[10px] text-muted-foreground/80">
                {new Date(timeStamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {canAction && (
          isIncoming ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onActionClick('receive', box)
              }}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
              {isProcessing ? 'Receiving...' : 'Receive Box'}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onActionClick('send', box)
              }}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isProcessing ? 'Sending...' : 'Send to Endorsement'}
            </button>
          )
        )}
      </div>

      {isExpanded && <CutBoxBooks isLoadingBooks={isLoadingBooks} books={books} />}
    </div>
  )
}
