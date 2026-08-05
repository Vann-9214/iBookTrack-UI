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
      {transitionsLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center min-h-[100px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {transitions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
          <div className="premium-gradient-ui-card__chip flex h-12 w-12 items-center justify-center rounded-full">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No transitions logged yet. Use &quot;Receive&quot; buttons above to advance boxes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col border-t border-border/50 max-h-[600px] overflow-y-auto overflow-x-auto relative">
          <div className="min-w-max">
            <div className="premium-gradient-ui-card__table-header flex items-center gap-4 px-6 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-20">
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

            {transitions.map((t) => (
              <TransitionLogRow
                key={t.id}
                transition={t}
                isExpanded={expandedTimelineId === t.id}
                onToggle={() => onToggleTimeline(t.id)}
              />
            ))}
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
