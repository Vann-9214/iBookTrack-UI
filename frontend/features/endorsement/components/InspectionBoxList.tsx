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
  currentUserId: string
}

export function InspectionBoxList({
  loadingEndorsement,
  filteredInspection,
  inspExpandedBoxId,
  inspRowBooks,
  loadingInspRowBooks,
  toggleInspRow,
  openConfirm,
  currentUserId,
}: InspectionBoxListProps) {
  return (
    <div className="flex-1 flex flex-col">
      <EndorsementBoxList
        title="Boxes to Inspect"
        eyebrow="Inspect"
        subtitleSuffix="Received by Endorsement"
        boxes={filteredInspection}
        expandedBoxId={inspExpandedBoxId}
        booksByBox={inspRowBooks}
        loadingBoxId={loadingInspRowBooks}
        loading={loadingEndorsement}
        onToggle={(id) => toggleInspRow(id)}
        emptyText="No boxes to inspect"
        emptySubtext="Receive boxes from the Incoming Boxes tab first."
        emptyIcon={<ClipboardCheck className="h-5 w-5" />}
        renderBadge={(box, expanded) => {
          const session = box.box_sessions?.[0]
          if (session && (session.status === 'in_progress' || session.status === 'delayed')) {
            return (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap',
                expanded ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
              )}>
                Session Ongoing
              </span>
            )
          }
          return (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              expanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
            )}>
              Ready for Inspection
            </span>
          )
        }}
        renderAction={(box: BoxEntry, expanded) => {
          const session = box.box_sessions?.[0]
          if (session && (session.status === 'in_progress' || session.status === 'delayed')) {
            if (session.endorsement_session_started_by !== currentUserId) {
              return (
                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', session.status === 'delayed' ? 'text-amber-500' : 'text-red-500')}>
                    {session.status === 'delayed' ? 'Delayed' : 'Locked'}
                  </span>
                  <span className={cn('text-[10px]', expanded ? 'text-white/80' : 'text-muted-foreground')}>
                    by {session.endorsement_started_profile?.name || 'another user'}
                  </span>
                </div>
              )
            }
            return (
              <button
                onClick={(e) => { e.stopPropagation(); openConfirm('start_session', box) }}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 transition-colors shrink-0',
                  expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
                )}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Resume Session
              </button>
            )
          }
          return (
            <button
              onClick={(e) => { e.stopPropagation(); openConfirm('start_session', box) }}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 transition-colors shrink-0',
                expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
              )}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Start Session
            </button>
          )
        }}
        renderDate={(box: BoxEntry) => {
          const session = box.box_sessions?.[0]
          const isVerifying = session?.status === 'in_progress' || session?.status === 'delayed'
          const displayTime = isVerifying && session?.endorsement_session_started_at
            ? session.endorsement_session_started_at
            : session?.endorsement_time_received
          return displayTime ? new Date(displayTime) : null
        }}
        renderReceivedByLabel={(box: BoxEntry) => {
          const session = box.box_sessions?.[0]
          if (session && (session.status === 'in_progress' || session.status === 'delayed')) {
            return 'In Progress By'
          }
          return 'Received By'
        }}
        renderReceivedBy={(box: BoxEntry) => {
          const session = box.box_sessions?.[0]
          if (session && (session.status === 'in_progress' || session.status === 'delayed')) {
            return session.endorsement_started_profile?.name || 'Unknown'
          }
          return session?.endorsement_received_profile?.name || 'Unknown'
        }}
        renderBooks={(box, books) => <EndorsementBookList books={books} loading={loadingInspRowBooks === box.id} />}
      />
    </div>
  )
}
