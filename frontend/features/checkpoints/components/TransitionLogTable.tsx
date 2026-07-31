import { Loader2 } from 'lucide-react'
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
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No transitions logged yet. Use "Receive" buttons above to advance boxes.
        </div>
      ) : (
        <div className="flex flex-col border-t border-border/50 max-h-[600px] overflow-y-auto overflow-x-auto relative">
          <div className="min-w-max">
            <div className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-20 shadow-sm">
              <div className="w-[220px] shrink-0 flex items-center">
                <div className="w-[80px] shrink-0 mr-2">Box & Lot</div>
                <div className="w-[130px] shrink-0">Stage</div>
              </div>
              <div className="w-[180px] shrink-0">Status</div>
              <div className="w-[130px] shrink-0">
                Books
                <div className="text-[8px] opacity-75 font-medium mt-0.5 normal-case tracking-normal">
                  (Processable / Expected)
                </div>
              </div>
              <div className="w-[110px] shrink-0">
                Transmitted
                <div className="text-[8px] opacity-75 font-medium mt-0.5 normal-case tracking-normal">
                  (Transmitted / Processable)
                </div>
              </div>
              <div className="w-[150px] shrink-0 min-w-0">Holder</div>
              <div className="w-[100px] shrink-0 ml-auto pr-4 text-right">Updated / Created</div>
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
