import { AlertOctagon, Download } from 'lucide-react'
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
  exportToCsv: () => void
  isExportDisabled: boolean
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
  exportToCsv,
  isExportDisabled,
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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-wrap">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5',
            brand === 'jaguar'
              ? 'bg-gradient-to-br from-emerald-400 to-green-600'
              : 'bg-gradient-to-br from-indigo-400 to-blue-600'
          )}
        >
          <AlertOctagon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
            Non-Processable
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
            Overview of issues for{' '}
            <span
              className={cn(
                'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
                brand === 'jaguar'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              )}
            >
              {brand}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-3 sm:mt-0 w-full sm:w-auto justify-end">
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
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportToCsv} 
          disabled={isExportDisabled} 
          className="gap-1.5 h-8"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>

        <RefreshControl
          onRefresh={fetchCounts}
          refreshing={loading}
          lastUpdated={lastUpdated}
          storageKey={`non-processable-${brand}`}
          className="hidden sm:flex"
        />
      </div>
    </header>
  )
}
