'use client'

import { Inbox, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EndorsementBookList } from './EndorsementBookList'
import { EndorsementBoxList } from './EndorsementBoxList'
import type { BoxEntry, BoxBookEntry } from '../types/endorsement.types'

interface IncomingBoxesProps {
  loadingIncoming: boolean
  filteredIncoming: BoxEntry[]
  expandedBoxId: string | null
  boxBooks: Record<string, BoxBookEntry[]>
  loadingBoxBooks: string | null
  receivingBox: string | null
  toggleBox: (boxId: string) => void
  openConfirm: (action: 'receive' | 'start_session' | 'send_to_scan', box: BoxEntry) => void
}

export function IncomingBoxes({
  loadingIncoming,
  filteredIncoming,
  expandedBoxId,
  boxBooks,
  loadingBoxBooks,
  receivingBox,
  toggleBox,
  openConfirm,
}: IncomingBoxesProps) {
  return (
    <div className="flex-1 flex flex-col">
      <EndorsementBoxList
        title="Incoming Boxes"
        eyebrow="Receive"
        subtitleSuffix="Sent from Cut"
        boxes={filteredIncoming}
        expandedBoxId={expandedBoxId}
        booksByBox={boxBooks}
        loadingBoxId={loadingBoxBooks}
        loading={loadingIncoming}
        onToggle={(id) => toggleBox(id)}
        emptyText="No incoming boxes"
        emptySubtext="Boxes advanced from the Cut stage will appear here."
        emptyIcon={<Inbox className="h-5 w-5" />}
        renderBadge={(_, expanded) => (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            expanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
          )}>
            Sent from Cut
          </span>
        )}
        renderAction={(box: BoxEntry, expanded) => (
          <button
            onClick={(e) => { e.stopPropagation(); openConfirm('receive', box) }}
            disabled={receivingBox === box.id}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 transition-colors shrink-0',
              expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
            )}
          >
            {receivingBox === box.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Inbox className="h-3.5 w-3.5" />}
            {receivingBox === box.id ? 'Receiving...' : 'Receive Box'}
          </button>
        )}
        renderDate={(box: BoxEntry) => {
          const cutTime = box.box_sessions?.[0]?.cut_time_send
          return cutTime ? new Date(cutTime) : null
        }}
        renderSender={(box: BoxEntry) => box.box_sessions?.[0]?.cut_send_profile?.name || null}
        renderBooks={(box, books) => <EndorsementBookList books={books} loading={loadingBoxBooks === box.id} />}
      />
    </div>
  )
}
