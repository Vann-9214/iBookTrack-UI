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
      <div className="relative flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="premium-gradient-ui-card__icon">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-strong)] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-strong)]" />
              </span>
              <p className="premium-gradient-ui-card__eyebrow">Live tracking</p>
            </div>
            <h2 className="premium-gradient-ui-card__title">Box Pipeline Tracker</h2>
          </div>
        </div>
        <div className="premium-gradient-ui-card__chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold">
          {totalTransitions.toLocaleString()} tracked {totalTransitions === 1 ? 'box' : 'boxes'}
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
