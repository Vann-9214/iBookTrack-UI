import React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilterStatus, ComputedStatus, LotStatusRow } from '../types/reports.types'
import { STATUS_META } from '../utils/reports.helpers'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportsExportButton } from './ReportsExportButton'

interface ReportFiltersProps {
  search: string
  setSearch: (search: string) => void
  filter: FilterStatus
  setFilter: (filter: FilterStatus) => void
  counts: Record<FilterStatus, number>
  brand?: string
  lots?: LotStatusRow[]
  loading?: boolean
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  search,
  setSearch,
  filter,
  setFilter,
  counts,
  brand = 'default',
  lots,
  loading = false,
}) => {
  const isJaguar = brand === 'jaguar'
  const statuses: FilterStatus[] = ['all', 'closed', 'open', 'in-progress']

  const tabActiveTheme = 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-[color-mix(in_oklch,var(--primary)_70%,black)] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-transparent'

  return (
    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full pb-1">
      {/* Tabs Control */}
      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        <Tabs value={filter} className="w-full sm:w-auto min-w-0" onValueChange={(val) => setFilter(val as FilterStatus)}>
          <TabsList className={cn("w-full flex flex-nowrap bg-white/70 border-transparent shadow-sm ring-1 ring-black/5 h-8 p-0.5 rounded-lg", loading && "opacity-50 pointer-events-none")}>
            {statuses.map(s => {
              const meta = s === 'all' ? null : STATUS_META[s as ComputedStatus]
              const label = s === 'all' ? 'All Lots' : meta?.label
              const isActive = filter === s
              const Icon = meta?.icon || (() => null)
              return (
                <TabsTrigger 
                  key={s}
                  disabled={loading} 
                  value={s} 
                  className={cn("flex-1 text-[9px] sm:text-[11px] px-1 sm:px-3 py-1 rounded-md transition-all font-medium data-[state=active]:font-bold whitespace-nowrap min-w-0 flex items-center justify-center gap-1", tabActiveTheme)}
                >
                  <Icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 hidden sm:block", isActive ? (s === 'all' ? (isJaguar ? 'text-emerald-500' : 'text-blue-500') : meta?.color.split(' ')[0]) : 'text-slate-400')} />
                  <span className="truncate">{label}</span>
                  <span className={cn(
                    "ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] leading-none font-black shrink-0",
                    filter === s ? "bg-white/20" : "bg-black/5"
                  )}>
                    {counts[s]}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Search Input & Export */}
      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        <div className="relative group flex-1 sm:w-64 sm:flex-none">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isJaguar ? "text-emerald-500 group-focus-within:text-emerald-600" : "text-blue-500 group-focus-within:text-blue-600")} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search lot number…"
            disabled={loading}
            className={cn(
              "w-full h-9 pl-9 pr-4 text-[12px] font-medium bg-white/60 border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0 disabled:opacity-50",
              isJaguar ? "focus-visible:border-emerald-300 focus-visible:ring-emerald-100/50" : "focus-visible:border-blue-300 focus-visible:ring-blue-100/50"
            )}
          />
        </div>
        <ReportsExportButton brand={brand} lots={lots || []} disabled={loading} />
      </div>
    </div>
  )
}
