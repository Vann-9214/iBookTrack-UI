'use client'

import { Boxes, ChevronDown, ChevronRight, ClipboardList, Loader2, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { Pagination } from '@/components/common/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { usePagination } from '@/hooks/usePagination'
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
  const isMobile = useIsMobile()
  const pagination = usePagination({ totalItems: boxes.length, defaultPageSize })
  const paginatedBoxes = boxes.slice(pagination.offset, pagination.offset + pagination.limit)

  const title = sessionOngoing ? 'Active Boxes' : 'Boxes to Verify'
  const eyebrow = 'Book Verification'

  return (
    <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl p-4 sm:p-5">
      <div className="premium-gradient-ui-card__glow" />
      <div className="relative flex flex-col">
        <div className="mb-4 p-3 premium-gradient-ui-card__surface">
          <div className="flex items-start gap-3">
            <div className="premium-gradient-ui-card__icon w-10 h-10">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{eyebrow}</p>
              <h2 className="text-lg font-black tracking-tight text-foreground leading-none">{title}</h2>
              {!loading && (
                <p className="text-xs text-muted-foreground mt-1">
                  {boxes.length} box{boxes.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: defaultPageSize }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/50" />
            ))}
          </div>
        ) : boxes.length === 0 ? (
          <div className="py-12 text-center">
            {emptyIcon && <div className="premium-gradient-ui-card__icon mx-auto mb-4">{emptyIcon}</div>}
            <p className="font-semibold text-foreground">{emptyText}</p>
            {emptySubtext && <p className="text-sm text-muted-foreground">{emptySubtext}</p>}
          </div>
        ) : (
          paginatedBoxes.map((box) => {
            const isExpanded = expandedBoxId === box.id
            const rowBooks = booksByBox[box.id] || []
            const isLoadingBooks = loadingBoxId === box.id
            const bookCount = box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
            const isVerifying = box.box_sessions?.[0]?.status === 'in_progress' || box.box_sessions?.[0]?.status === 'delayed'
            const displayTime = sessionOngoing 
              ? undefined 
              : (isVerifying && box.box_sessions?.[0]?.inventory_session_started_at)
                ? box.box_sessions?.[0]?.inventory_session_started_at
                : box.box_sessions?.[0]?.inventory_time_received
            const created = displayTime ? new Date(displayTime) : (box.created_at ? new Date(box.created_at) : null)
            return (
              <div
                key={box.id}
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
                      onClick={() => onToggle(box.id)}
                      className={cn('shrink-0 transition-colors', isExpanded ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', isExpanded ? 'bg-white/20 text-white' : 'bg-primary/10 ring-1 ring-primary/20 text-primary')}>
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggle(box.id)}>
                      {sessionOngoing ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('text-[13px] font-bold', isExpanded ? 'text-white' : 'text-foreground')}>BOX {box.box_number}</p>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap',
                            isExpanded ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                          )}>Session Ongoing</span>
                        </div>
                      ) : (
                        <p className={cn('text-[13px] font-bold', isExpanded ? 'text-white' : 'text-foreground')}>BOX {box.box_number}</p>
                      )}
                      <p className={cn('text-[11px] font-medium', isExpanded ? 'text-white/80' : 'text-muted-foreground')}>
                        LOT {box.lot?.lot_number || (sessionOngoing ? '--' : '—')} · {bookCount} books
                      </p>
                    </div>
                    {!sessionOngoing && (
                      <div className="shrink-0 hidden sm:flex flex-col items-end mr-4">
                        <span className={cn('text-[10px] font-semibold uppercase tracking-wider', isExpanded ? 'text-white/60' : 'text-muted-foreground')}>
                          {(box.box_sessions?.[0]?.status === 'in_progress' || box.box_sessions?.[0]?.status === 'delayed') ? 'In Progress By' : 'Received By'}
                        </span>
                        <span className={cn('text-xs font-medium', isExpanded ? 'text-white' : 'text-foreground')}>
                          {(box.box_sessions?.[0]?.status === 'in_progress' || box.box_sessions?.[0]?.status === 'delayed')
                            ? (box.box_sessions?.[0]?.inventory_started_profile?.name || 'Unknown')
                            : (box.box_sessions?.[0]?.inventory_received_profile?.name || 'Unknown')}
                        </span>
                      </div>
                    )}
                    {!sessionOngoing && created && (
                      <div className="shrink-0 hidden sm:block text-right mr-2">
                        <p className={cn('text-xs', isExpanded ? 'text-white/80' : 'text-muted-foreground')}>{created.toLocaleDateString()}</p>
                        <p className={cn('text-[10px]', isExpanded ? 'text-white/70' : 'text-muted-foreground/80')}>{created.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                      </div>
                    )}
                  </div>
                  {!sessionOngoing && !isMobile && (
                    box.box_sessions?.[0]?.status === 'in_progress' || box.box_sessions?.[0]?.status === 'delayed' ? (
                      box.box_sessions[0].inventory_session_started_by !== currentUserId ? (
                        <div className="flex flex-col items-end shrink-0 ml-2">
                          <span className={cn('text-[10px] font-bold uppercase tracking-wider', box.box_sessions[0].status === 'delayed' ? 'text-amber-500' : 'text-red-500')}>
                            {box.box_sessions[0].status === 'delayed' ? 'Delayed' : 'Locked'}
                          </span>
                          <span className={cn('text-[10px]', isExpanded ? 'text-white/80' : 'text-muted-foreground')}>
                            by {box.box_sessions[0].inventory_started_profile?.name || 'another user'}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onStartSession(box)}
                          disabled={loadingStartSession}
                          className={cn(
                            'w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0',
                            isExpanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
                          )}
                        >
                          {loadingStartSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                          {loadingStartSession ? 'Resuming...' : 'Resume Session'}
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => onStartSession(box)}
                        disabled={loadingStartSession}
                        className={cn(
                          'w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0',
                          isExpanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
                        )}
                      >
                        {loadingStartSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                        {loadingStartSession ? 'Starting...' : 'Start Session'}
                      </button>
                    )
                  )}
                </div>
                {isExpanded && (
                  <div className="bg-white p-0">
                    <InventoryBookList books={rowBooks} box={box} loading={isLoadingBooks} showFlags={!sessionOngoing} />
                  </div>
                )}
              </div>
            )
          })
        )}

        {!loading && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.setPageSize}
            canPrevPage={pagination.canPrevPage}
            canNextPage={pagination.canNextPage}
            className="mt-3"
          />
        )}
      </div>
    </div>
  )
}
