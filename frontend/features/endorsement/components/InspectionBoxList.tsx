'use client'

import { ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EndorsementBookList } from './EndorsementBookList'
import { EndorsementBoxList } from './EndorsementBoxList'
import type { BoxEntry, BoxBookEntry } from '../types/endorsement.types'

interface InspectionBoxListProps {
  loadingEndorsement: boolean
  filteredInspection: BoxEntry[]
  inspExpandedBoxId: string | null
  inspRowBooks: Record<string, BoxBookEntry[]>
  loadingInspRowBooks: string | null
  toggleInspRow: (boxId: string) => void
  openConfirm: (action: 'receive' | 'start_session' | 'send_to_scan', box: BoxEntry) => void
}

export function InspectionBoxList({
  loadingEndorsement,
  filteredInspection,
  inspExpandedBoxId,
  inspRowBooks,
  loadingInspRowBooks,
  toggleInspRow,
  openConfirm,
}: InspectionBoxListProps) {
  return (
    <div className="flex-1 flex flex-col">
      <EndorsementBoxList
        title="Boxes to Inspect"
        eyebrow="Inspect"
        boxes={filteredInspection}
        expandedBoxId={inspExpandedBoxId}
        booksByBox={inspRowBooks}
        loadingBoxId={loadingInspRowBooks}
        loading={loadingEndorsement}
        onToggle={(id) => toggleInspRow(id)}
        emptyText="No boxes to inspect"
        emptySubtext="Receive boxes from the Incoming Boxes tab first."
        emptyIcon={<ClipboardCheck className="h-5 w-5" />}
        renderBadge={(_, expanded) => (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            expanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
          )}>
            Ready for Inspection
          </span>
        )}
        renderAction={(box: BoxEntry, expanded) => (
          <button
            onClick={(e) => { e.stopPropagation(); openConfirm('start_session', box) }}
            className={cn(
              'w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0',
              expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
            )}
          >
            <ClipboardCheck className="h-4 w-4" />
            Start Session
          </button>
        )}
        renderDate={(box: BoxEntry) => {
          const receivedTime = box.box_sessions?.[0]?.endorsement_time_received
          return receivedTime ? new Date(receivedTime) : null
        }}
        renderBooks={(box, books) => <EndorsementBookList books={books} loading={loadingInspRowBooks === box.id} />}
      />
    </div>
  )
}
