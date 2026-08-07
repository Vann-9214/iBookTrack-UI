import { AlertOctagon, Download, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshControl } from '@/components/refresh-control'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface NonProcessableHeaderProps {
  brand: string
  selectedYear: number
  setSelectedYear: (y: number) => void
  selectedMonth: number
  setSelectedMonth: (m: number) => void
  selectedWeek: number
  setSelectedWeek: (w: number) => void

  loading: boolean
  lastUpdated: Date | null
  fetchCounts: () => void
}

export function NonProcessableHeader({
  brand,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  selectedWeek,
  setSelectedWeek,

  loading,
  lastUpdated,
  fetchCounts
}: NonProcessableHeaderProps) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const startDay = new Date(selectedYear, selectedMonth, 1).getDay()
  const weeksInMonth = Math.ceil((daysInMonth + startDay) / 7)
  const weeks = Array.from({ length: weeksInMonth }, (_, i) => i + 1)

  return (
    <header className="relative z-10 shrink-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between flex-wrap sm:min-h-[105px] lg:min-h-0">
        <div className="flex items-start gap-3 sm:gap-4 w-full lg:w-auto">
          <div
            className={cn(
              'p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0',
              'bg-primary'
            )}
          >
            <AlertOctagon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 flex-1 sm:pr-[280px] lg:pr-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">
                  Non-Processable
                </h1>
                <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground leading-snug">
                  Overview of issues for{' '}
                  <span
                    className={cn(
                      'inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
                      'bg-primary'
                    )}
                  >
                    {brand}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={fetchCounts}
                  disabled={loading}
                  className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition disabled:opacity-50 shrink-0"
                  aria-label="Refresh"
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-row sm:flex-col lg:flex-row items-center sm:items-end lg:items-center gap-2 flex-wrap justify-end w-full sm:w-auto sm:absolute lg:relative sm:top-0 sm:right-0">
          <div className="flex items-center gap-2 order-2 sm:order-1 lg:order-2">
            <RefreshControl
              onRefresh={fetchCounts}
              refreshing={loading}
              lastUpdated={lastUpdated}
              storageKey={`non-processable-${brand}`}
              className="hidden sm:flex shrink-0 h-8"
            />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-end order-1 sm:order-2 lg:order-1 sm:mt-6 lg:mt-0">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="h-8 w-[90px] text-xs font-semibold bg-white hover:bg-accent hover:text-accent-foreground transition-colors">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="h-8 w-[110px] text-xs font-semibold bg-white hover:bg-accent hover:text-accent-foreground transition-colors">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">All Months</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedWeek > weeksInMonth && selectedWeek !== 0 ? weeksInMonth.toString() : selectedWeek.toString()} 
              onValueChange={(v) => setSelectedWeek(parseInt(v))}
              disabled={selectedMonth === -1}
            >
              <SelectTrigger className="h-8 w-[105px] text-xs font-semibold bg-white hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">By Month</SelectItem>
                {weeks.map(w => (
                  <SelectItem key={w} value={w.toString()}>Week {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  )
}
