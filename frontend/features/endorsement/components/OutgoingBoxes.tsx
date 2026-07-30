'use client'

import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EndorsementBookList } from './EndorsementBookList'
import { EndorsementBoxList } from './EndorsementBoxList'
import type { BoxEntry, BoxBookEntry } from '../types/endorsement.types'

interface OutgoingBoxesProps {
  filteredOutgoing: BoxEntry[]
  expandedBoxId: string | null
  boxBooks: Record<string, BoxBookEntry[]>
  loadingBoxBooks: string | null
  sendingToScan: string | null
  toggleBox: (boxId: string) => void
  openConfirm: (action: 'receive' | 'start_session' | 'send_to_scan', box: BoxEntry) => void
  loadingEndorsement?: boolean
}

export function OutgoingBoxes({
  filteredOutgoing,
  expandedBoxId,
  boxBooks,
  loadingBoxBooks,
  sendingToScan,
  toggleBox,
  openConfirm,
  loadingEndorsement,
}: OutgoingBoxesProps) {
  return (
    <div className="flex-1 flex flex-col">
      <EndorsementBoxList
        title="Outgoing Boxes"
        eyebrow="Send"
        boxes={filteredOutgoing}
        expandedBoxId={expandedBoxId}
        booksByBox={boxBooks}
        loadingBoxId={loadingBoxBooks}
        loading={loadingEndorsement ?? false}
        onToggle={(id) => toggleBox(id)}
        emptyText="No outgoing boxes yet"
        emptySubtext="Complete an inspection session in the Book Inspection tab to add boxes here."
        emptyIcon={<Send className="h-5 w-5" />}
        renderBadge={(_, expanded) => (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            expanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
          )}>
            Endorsed
          </span>
        )}
        renderAction={(box: BoxEntry, expanded) => (
          <button
            onClick={(e) => { e.stopPropagation(); openConfirm('send_to_scan', box) }}
            disabled={sendingToScan === box.id}
            className={cn(
              'w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0',
              expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
            )}
          >
            {sendingToScan === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sendingToScan === box.id ? 'Sending...' : 'Send to Scan'}
          </button>
        )}
        renderDate={(box: BoxEntry) => {
          const verifiedTime = box.latest_endorsement_scan_at || box.box_sessions?.[0]?.updated_at
          return verifiedTime ? new Date(verifiedTime) : null
        }}
        renderCompletedBy={(box: BoxEntry) => box.box_sessions?.[0]?.endorsement_complete_profile?.name || box.box_sessions?.[0]?.endorsement_received_profile?.name || null}
        renderBooks={(box, books) => <EndorsementBookList books={books} loading={loadingBoxBooks === box.id} />}
      />
    </div>
  )
}
