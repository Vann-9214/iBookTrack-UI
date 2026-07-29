import React from 'react'
import { Search } from 'lucide-react'
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
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search lot number…"
          className="w-56 h-9 pl-9 pr-4 text-xs font-medium bg-white/60 border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary/50"
        />
      </div>
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
