'use client'

import { Download, Loader2, Trophy, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RefreshControl } from '@/components/refresh-control'
import { cn } from '@/lib/utils'
import type { TransmissionBrand } from '../types/transmission.types'

interface TransmissionFiltersProps {
  brand: TransmissionBrand
  fromDate: string
  setFromDate: (value: string) => void
  toDate: string
  setToDate: (value: string) => void
  fromDateOpenMobile: boolean
  setFromDateOpenMobile: (open: boolean) => void
  toDateOpenMobile: boolean
  setToDateOpenMobile: (open: boolean) => void
  fromDateOpenDesktop: boolean
  setFromDateOpenDesktop: (open: boolean) => void
  toDateOpenDesktop: boolean
  setToDateOpenDesktop: (open: boolean) => void
  newProcessOnly: boolean
  setNewProcessOnly: (value: boolean) => void
  exporting: boolean
  handleExport: () => void
  handleOpenRanking: () => void
  loading: boolean
  lastUpdated: Date | null
  fetchLiveData: (from?: string, to?: string) => Promise<void>
}

export function TransmissionFilters({
  brand,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  fromDateOpenMobile,
  setFromDateOpenMobile,
  toDateOpenMobile,
  setToDateOpenMobile,
  fromDateOpenDesktop,
  setFromDateOpenDesktop,
  toDateOpenDesktop,
  setToDateOpenDesktop,
  newProcessOnly,
  setNewProcessOnly,
  exporting,
  handleExport,
  handleOpenRanking,
  loading,
  lastUpdated,
  fetchLiveData,
}: TransmissionFiltersProps) {
  const NewProcessCheckbox = (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={newProcessOnly}
        onChange={(e) => setNewProcessOnly(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-gray-300 accent-primary cursor-pointer"
      />
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">New Process Only</span>
    </label>
  )

  return (
    <>
      {/* Mobile layout */}
      <div className="flex flex-col gap-3 sm:hidden w-full">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">From</span>
            <Popover open={fromDateOpenMobile} onOpenChange={setFromDateOpenMobile} modal>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-9 justify-start text-left font-normal text-xs px-2 sm:px-3">
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{fromDate ? format(new Date(fromDate), 'MMM dd, yy') : 'Date'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                <Calendar
                  mode="single"
                  selected={fromDate ? new Date(fromDate) : undefined}
                  onSelect={(date) => {
                    setFromDate(date ? format(date, 'yyyy-MM-dd') : '')
                    setFromDateOpenMobile(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">To</span>
            <Popover open={toDateOpenMobile} onOpenChange={setToDateOpenMobile} modal>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-9 justify-start text-left font-normal text-xs px-2 sm:px-3">
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{toDate ? format(new Date(toDate), 'MMM dd, yy') : 'Date'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                <Calendar
                  mode="single"
                  selected={toDate ? new Date(toDate) : undefined}
                  onSelect={(date) => {
                    setToDate(date ? format(date, 'yyyy-MM-dd') : '')
                    setToDateOpenMobile(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex items-center justify-between w-full">
          {NewProcessCheckbox}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="h-8 px-2.5 gap-1.5"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span className="text-[11px] font-semibold">Export</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenRanking} className="h-8 px-2.5 gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">Rank</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop & Mobile Landscape layout */}
      <div className="hidden sm:flex absolute xl:relative top-0 right-0 flex-col xl:flex-row items-end xl:items-center gap-2 xl:gap-2 w-auto">
        
        {/* Buttons: Top right on sm, Right side on xl */}
        <div className="flex items-center gap-1.5 order-1 xl:order-3">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5 h-8">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenRanking} className="gap-1.5 h-8">
            <Trophy className="h-3.5 w-3.5" /> Ranking
          </Button>
          <RefreshControl
            onRefresh={() => fetchLiveData()}
            refreshing={loading}
            lastUpdated={lastUpdated}
            storageKey="transmission"
            className="hidden sm:flex h-8"
          />
        </div>

        {/* Dates & Checkbox: Below buttons on sm, Left side on xl */}
        <div className="flex items-center gap-2 flex-wrap justify-end order-2 xl:order-1 mt-6 xl:mt-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground hidden xl:inline">From</span>
            <Popover open={fromDateOpenDesktop} onOpenChange={setFromDateOpenDesktop}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-[120px] xl:w-36 justify-start text-left font-normal text-xs px-2 xl:px-3">
                  <CalendarIcon className="mr-1.5 xl:mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{fromDate ? format(new Date(fromDate), 'MMM dd, yy') : 'Pick date'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate ? new Date(fromDate) : undefined}
                  onSelect={(date) => {
                    setFromDate(date ? format(date, 'yyyy-MM-dd') : '')
                    setFromDateOpenDesktop(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground hidden xl:inline">To</span>
            <Popover open={toDateOpenDesktop} onOpenChange={setToDateOpenDesktop}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-[120px] xl:w-36 justify-start text-left font-normal text-xs px-2 xl:px-3">
                  <CalendarIcon className="mr-1.5 xl:mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{toDate ? format(new Date(toDate), 'MMM dd, yy') : 'Pick date'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate ? new Date(toDate) : undefined}
                  onSelect={(date) => {
                    setToDate(date ? format(date, 'yyyy-MM-dd') : '')
                    setToDateOpenDesktop(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="bg-card/50 px-2 py-1 rounded-md border border-border/40 xl:border-transparent xl:bg-transparent xl:p-0">
            {NewProcessCheckbox}
          </div>
        </div>
      </div>
    </>
  )
}
