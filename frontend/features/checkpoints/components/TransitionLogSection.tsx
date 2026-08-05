import { Scan } from 'lucide-react'
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
    <Card className="premium-gradient-ui-card premium-gradient-ui-card--static overflow-hidden py-0 gap-0">
      <div className="premium-gradient-ui-card__glow" />
      <div className="relative flex items-center justify-between px-6 py-5 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="premium-gradient-ui-card__icon">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <p className="premium-gradient-ui-card__eyebrow">Live tracking</p>
            <h2 className="premium-gradient-ui-card__title">Box Pipeline Tracker</h2>
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
