import React from 'react'
import { cn } from '@/lib/utils'
import { FilterStatus, ComputedStatus } from '../types/reports.types'
import { STATUS_META } from '../utils/reports.helpers'

interface ReportFiltersProps {
  search: string
  setSearch: (search: string) => void
  filter: FilterStatus
  setFilter: (filter: FilterStatus) => void
  counts: Record<FilterStatus, number>
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  search,
  setSearch,
  filter,
  setFilter,
  counts,
}) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search lot number…"
        className="h-9 rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-52"
      />
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
        {(['all', 'closed', 'open', 'in-progress'] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              filter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s === 'all' ? 'All' : STATUS_META[s as ComputedStatus].label}
            <span className="ml-1.5 opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
