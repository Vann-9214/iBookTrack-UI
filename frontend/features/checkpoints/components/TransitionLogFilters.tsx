import { useState } from 'react'
import { Search, Calendar as CalendarIcon, X, SlidersHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { STAGE_ORDER, STAGE_META } from '../utils/checkpoints.helpers'
import type { Stage } from '../types/checkpoints.types'

interface TransitionLogFiltersProps {
  brand: string
  searchInput: string
  onSearchInputChange: (value: string) => void
  stageFilter: Stage | ''
  onStageFilterChange: (value: Stage | '') => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  onSearchApply: () => void
  loading?: boolean
}

const gradientButtonClass =
  'premium-gradient-ui-card--solid inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold text-white! shadow-md transition hover:-translate-y-0.5 hover:shadow-lg [&_svg]:text-white! [&_svg]:opacity-100!'

export function TransitionLogFilters({
  searchInput,
  onSearchInputChange,
  stageFilter,
  onStageFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onSearchApply,
  loading = false,
}: TransitionLogFiltersProps) {
  const [rangeOpen, setRangeOpen] = useState(false)

  const hasActiveFilters = Boolean(searchInput || stageFilter || dateFrom || dateTo)

  const handleClear = () => {
    onSearchInputChange('')
    onSearchApply()
    onStageFilterChange('')
    onDateFromChange('')
    onDateToChange('')
  }

  const dateRange: DateRange | undefined = (dateFrom || dateTo)
    ? { from: dateFrom ? new Date(dateFrom) : undefined, to: dateTo ? new Date(dateTo) : undefined }
    : undefined

  const dateRangeLabel = dateFrom || dateTo
    ? `${dateFrom ? format(new Date(dateFrom), 'MMM d') : '...'} – ${dateTo ? format(new Date(dateTo), 'MMM d') : '...'}`
    : 'All dates'

  const handleRangeSelect = (range: DateRange | undefined) => {
    onDateFromChange(range?.from ? format(range.from, 'yyyy-MM-dd') : '')
    onDateToChange(range?.to ? format(range.to, 'yyyy-MM-dd') : '')
    if (range?.from && range?.to) setRangeOpen(false)
  }

  return (
    <div className="premium-gradient-ui-card__toolbar px-5 py-3 border-b border-border/50">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-1.5 text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Filters</span>
        </div>

        <div className="relative shrink-0 flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-9 w-44 sm:w-52 rounded-full bg-black/5" />
          ) : (
            <>
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search box or lot"
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSearchApply()
                }}
                className="h-9 w-44 sm:w-52 rounded-full border-border/60 bg-background/70 pl-8 pr-3 text-xs font-medium shadow-sm focus-visible:ring-4 focus-visible:ring-primary/15"
              />
            </>
          )}
        </div>

        <Select
          value={stageFilter || 'all'}
          onValueChange={(v) => onStageFilterChange(v === 'all' ? '' : (v as Stage))}
        >
          <SelectTrigger className={cn(gradientButtonClass, 'border-none [&_svg]:size-3.5')}>
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGE_ORDER.filter((s) => s !== 'transmit').map((stage) => (
              <SelectItem key={stage} value={stage}>
                {STAGE_META[stage].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={gradientButtonClass}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateRangeLabel}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={dateRange}
              onSelect={handleRangeSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="h-9 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
