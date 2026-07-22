import { Scan } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { TransitionLogFilters } from './TransitionLogFilters'
import { TransitionLogTable } from './TransitionLogTable'
import type { Transition, Stage } from '../types/checkpoints.types'

interface TransitionLogSectionProps {
  brand: string
  transitions: Transition[]
  totalTransitions: number
  transitionsLoading: boolean
  transitionsPagination: any
  expandedTimelineId: string | null
  searchInput: string
  stageFilter: Stage | ''
  dateFrom: string
  dateTo: string
  onSearchInputChange: (value: string) => void
  onSearchApply: () => void
  onStageFilterChange: (value: Stage | '') => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onToggleTimeline: (id: string) => void
}

export function TransitionLogSection({
  brand,
  transitions,
  totalTransitions,
  transitionsLoading,
  transitionsPagination,
  expandedTimelineId,
  searchInput,
  stageFilter,
  dateFrom,
  dateTo,
  onSearchInputChange,
  onSearchApply,
  onStageFilterChange,
  onDateFromChange,
  onDateToChange,
  onToggleTimeline,
}: TransitionLogSectionProps) {
  return (
    <Card className="border-border/50 bg-card overflow-hidden py-0 gap-0 shadow-xl shadow-black/[0.03] ring-1 ring-black/5 rounded-2xl">
      <div
        className={cn(
          'flex items-center justify-between px-6 py-5 border-b border-border/50',
          brand === 'jaguar'
            ? 'bg-gradient-to-r from-green-50/50 to-transparent'
            : 'bg-gradient-to-r from-blue-50/50 to-transparent'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm',
              brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500'
            )}
          >
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Box Pipeline Tracker</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Showing page {transitionsPagination.currentPage} of{' '}
              {Math.max(1, transitionsPagination.totalPages)}
            </p>
          </div>
        </div>
      </div>

      <TransitionLogFilters
        brand={brand}
        searchInput={searchInput}
        onSearchInputChange={onSearchInputChange}
        onSearchApply={onSearchApply}
        stageFilter={stageFilter}
        onStageFilterChange={onStageFilterChange}
        dateFrom={dateFrom}
        onDateFromChange={onDateFromChange}
        dateTo={dateTo}
        onDateToChange={onDateToChange}
      />

      <TransitionLogTable
        transitions={transitions}
        totalTransitions={totalTransitions}
        transitionsLoading={transitionsLoading}
        transitionsPagination={transitionsPagination}
        expandedTimelineId={expandedTimelineId}
        onToggleTimeline={onToggleTimeline}
      />
    </Card>
  )
}
