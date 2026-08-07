import { Loader2, Inbox } from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/pagination'

import { TransitionLogRow } from './TransitionLogRow'
import type { Transition } from '../types/checkpoints.types'

interface TransitionLogTableProps {
  transitions: Transition[]
  totalTransitions: number
  transitionsLoading: boolean
  transitionsPagination: any
  expandedTimelineId: string | null
  onToggleTimeline: (id: string) => void
}

import { Skeleton } from '@/components/ui/skeleton'

export function TransitionLogTable({
  transitions,
  totalTransitions,
  transitionsLoading,
  transitionsPagination,
  expandedTimelineId,
  onToggleTimeline,
}: TransitionLogTableProps) {
  return (
    <CardContent className="p-0 relative">
      {transitionsLoading && transitions.length === 0 ? (
        <div className="flex flex-col border border-border/50 bg-background/50 rounded-2xl max-h-[400px] overflow-y-auto overflow-x-auto relative shadow-sm">
          <div className="min-w-max p-3 flex flex-col gap-2">
            <div className="flex items-center gap-6 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-20 bg-background/95 backdrop-blur-md rounded-lg shadow-sm border border-border/50">
              <div className="w-[40px] shrink-0">#</div>
              <div className="w-[260px] shrink-0 flex items-center">
                <div className="w-[110px] shrink-0 mr-2">Box & Lot</div>
                <div className="w-[140px] shrink-0">Stage</div>
              </div>
              <div className="w-[190px] shrink-0">Status</div>
              <div className="w-[140px] shrink-0">Books</div>
              <div className="w-[140px] shrink-0">Transmitted</div>
              <div className="flex-1 min-w-[200px]">User & Location</div>
              <div className="w-[60px] shrink-0 text-right">Time</div>
            </div>
            <div className="flex flex-col p-4 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg bg-black/5 dark:bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      ) : transitions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
          <div className="premium-gradient-ui-card__chip flex h-12 w-12 items-center justify-center rounded-full">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No transitions logged yet. Use &quot;Receive&quot; buttons above to advance boxes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col border border-border/50 bg-background/50 rounded-2xl max-h-[400px] overflow-y-auto overflow-x-auto relative shadow-sm">
          <div className="min-w-max p-3 flex flex-col gap-2">
            <div className="flex items-center gap-6 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-20 bg-background/95 backdrop-blur-md rounded-lg shadow-sm border border-border/50">
              <div className="w-[40px] shrink-0">#</div>
              <div className="w-[260px] shrink-0 flex items-center">
                <div className="w-[110px] shrink-0 mr-2">Box & Lot</div>
                <div className="w-[140px] shrink-0">Stage</div>
              </div>
              <div className="w-[190px] shrink-0">Status</div>
              <div className="w-[140px] shrink-0">
                Books
                <div className="text-[9px] opacity-75 font-medium normal-case tracking-normal">
                  (Processable / Expected)
                </div>
              </div>
              <div className="w-[140px] shrink-0">
                Transmitted
                <div className="text-[9px] opacity-75 font-medium normal-case tracking-normal">
                  (Transmitted / Processable)
                </div>
              </div>
              <div className="w-[170px] shrink-0 min-w-0">Holder</div>
              <div className="w-[120px] shrink-0 ml-auto pr-4 text-right">Updated / Created</div>
              <div className="w-4 shrink-0"></div>
            </div>

            {transitions.map((t, index) => {
              const globalIndex = ((transitionsPagination.currentPage || 1) - 1) * (transitionsPagination.pageSize || 10) + index + 1
              return (
                <TransitionLogRow
                  key={t.id}
                  transition={t}
                  index={globalIndex}
                  isExpanded={expandedTimelineId === t.id}
                  onToggle={() => onToggleTimeline(t.id)}
                />
              )
            })}
          </div>
        </div>
      )}

      {totalTransitions > 0 && (
        <Pagination
          currentPage={transitionsPagination.currentPage}
          totalPages={Math.max(1, transitionsPagination.totalPages)}
          pageSize={transitionsPagination.pageSize}
          onPageChange={transitionsPagination.goToPage}
          onPageSizeChange={transitionsPagination.setPageSize}
          canPrevPage={transitionsPagination.canPrevPage}
          canNextPage={transitionsPagination.canNextPage}
          pageSizeOptions={[]}
          showPageInfo={false}
        />
      )}
    </CardContent>
  )
}
