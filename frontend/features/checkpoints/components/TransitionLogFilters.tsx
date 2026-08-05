import { useState } from 'react'
import { Search, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
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
}

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
}: TransitionLogFiltersProps) {
  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)

  return (
    <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex flex-col md:flex-row gap-4 items-end">
      <div className="flex flex-row gap-3 w-full md:w-auto md:flex-1">
        <div className="relative flex-1 min-w-0">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Search
          </label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search box or lot (Press Enter)"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearchApply()
              }}
              className="w-full sm:w-64 h-9 pl-9 pr-4 text-xs font-medium bg-white/60 border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)] transition duration-300 rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary/50"
            />
          </div>
        </div>

        <div className="w-[140px] shrink-0">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Stage
          </label>
          <Select
            value={stageFilter || 'all'}
            onValueChange={(v) => onStageFilterChange(v === 'all' ? '' : (v as Stage))}
          >
            <SelectTrigger className="h-10 bg-background border-border/50 focus:ring-1 focus:ring-primary rounded-xl shadow-sm hover:border-border transition-colors">
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
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="w-full md:w-[140px]">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Date From
          </label>
          <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full h-10 justify-start text-left font-normal text-sm bg-background border-border/50 hover:bg-muted/50 hover:text-foreground rounded-xl shadow-sm group transition',
                  !dateFrom && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                {dateFrom ? format(new Date(dateFrom), 'MMM dd, yyyy') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom ? new Date(dateFrom) : undefined}
                onSelect={(date) => {
                  onDateFromChange(date ? format(date, 'yyyy-MM-dd') : '')
                  setFromDateOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-full md:w-[140px]">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Date To
          </label>
          <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full h-10 justify-start text-left font-normal text-sm bg-background border-border/50 hover:bg-muted/50 hover:text-foreground rounded-xl shadow-sm group transition',
                  !dateTo && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                {dateTo ? format(new Date(dateTo), 'MMM dd, yyyy') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo ? new Date(dateTo) : undefined}
                onSelect={(date) => {
                  onDateToChange(date ? format(date, 'yyyy-MM-dd') : '')
                  setToDateOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
