'use client'

import { ClipboardList, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InventoryBoxList } from './InventoryBoxList'
import { InventoryBookList } from './InventoryBookList'
import type { BookInBox, InventoryBox } from '../types/inventory.types'

export function InventoryVerificationBoxList({
  boxes,
  expandedBoxId,
  booksByBox,
  loadingBoxId,
  onToggle,
  onStartSession,
  loadingStartSession,
  sessionOngoing = false,
  loading = false,
  emptyText = 'No boxes to verify',
  emptySubtext,
  emptyIcon,
  defaultPageSize = 10,
  currentUserId,
}: {
  boxes: InventoryBox[]
  expandedBoxId: string | null
  booksByBox: Record<string, BookInBox[]>
  loadingBoxId: string | null
  onToggle: (boxId: string) => void
  onStartSession: (box: InventoryBox) => void
  loadingStartSession: boolean
  sessionOngoing?: boolean
  loading?: boolean
  emptyText?: string
  emptySubtext?: string
  emptyIcon?: React.ReactNode
  defaultPageSize?: number
  currentUserId?: string
}) {
  const title = sessionOngoing ? 'Active Boxes' : 'Boxes to Verify'
  const eyebrow = 'Book Verification'

  return (
    <InventoryBoxList
      title={title}
      eyebrow={eyebrow}
      boxes={boxes}
      expandedBoxId={expandedBoxId}
      booksByBox={booksByBox}
      loadingBoxId={loadingBoxId}
      loading={loading}
      onToggle={onToggle}
      emptyText={emptyText}
      emptySubtext={emptySubtext}
      emptyIcon={emptyIcon}
      defaultPageSize={defaultPageSize}
      subtitleSuffix="Received from Inventory"
      renderDate={(box) => {
        if (sessionOngoing) return null
        const isVerifying = box.box_sessions?.[0]?.status === 'in_progress' || box.box_sessions?.[0]?.status === 'delayed'
        const displayTime = (isVerifying && box.box_sessions?.[0]?.inventory_session_started_at)
          ? box.box_sessions?.[0]?.inventory_session_started_at
          : box.box_sessions?.[0]?.inventory_time_received
        return displayTime ? new Date(displayTime) : (box.created_at ? new Date(box.created_at) : null)
      }}
      renderCompletedBy={(box) => {
        if (sessionOngoing) return null
        return (box.box_sessions?.[0]?.status === 'in_progress' || box.box_sessions?.[0]?.status === 'delayed')
          ? box.box_sessions?.[0]?.inventory_started_profile?.name || 'Unknown'
          : box.box_sessions?.[0]?.inventory_received_profile?.name || 'Unknown'
      }}
      renderBadge={(box, expanded) => {
        if (!sessionOngoing) return null
        return (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap',
            expanded ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
          )}>Session Ongoing</span>
        )
      }}
      renderAction={(box, isExpanded) => {
        if (sessionOngoing) return null
        const session = box.box_sessions?.[0]
        if (session?.status === 'in_progress' || session?.status === 'delayed') {
          if (session.inventory_session_started_by !== currentUserId) {
            return (
              <div className="flex items-center gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border',
                  session.status === 'delayed'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                )}>
                  {session.status === 'delayed' ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span className="uppercase">
                    {session.status === 'delayed' ? 'Delayed' : 'In Progress'}
                  </span>
                </span>
                <span className={cn('hidden lg:inline text-[10px] font-medium', isExpanded ? 'text-white/80' : 'text-muted-foreground')}>
                  by {session.inventory_started_profile?.name || 'another user'}
                </span>
              </div>
            )
          }
          return (
            <button
              onClick={(e) => { e.stopPropagation(); onStartSession(box) }}
              disabled={loadingStartSession}
              className={cn(
                'hidden lg:flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 transition-colors shrink-0',
                isExpanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
              )}
            >
              {loadingStartSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              {loadingStartSession ? 'Resuming...' : 'Resume Session'}
            </button>
          )
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onStartSession(box) }}
            disabled={loadingStartSession}
            className={cn(
              'hidden lg:flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 transition-colors shrink-0',
              isExpanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
            )}
          >
            {loadingStartSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            {loadingStartSession ? 'Starting...' : 'Start Session'}
          </button>
        )
      }}
      renderBooks={(box, books) => (
        <InventoryBookList books={books} box={box} loading={loadingBoxId === box.id} showFlags={!sessionOngoing} />
      )}
    />
  )
}
