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

      {/* Desktop layout: all inline */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">From</span>
          <Popover open={fromDateOpenDesktop} onOpenChange={setFromDateOpenDesktop}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                {fromDate ? format(new Date(fromDate), 'MMM dd, yyyy') : 'Pick date'}
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
          <span className="text-xs text-muted-foreground">To</span>
          <Popover open={toDateOpenDesktop} onOpenChange={setToDateOpenDesktop}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                {toDate ? format(new Date(toDate), 'MMM dd, yyyy') : 'Pick date'}
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
        {NewProcessCheckbox}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenRanking} className="gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Ranking
          </Button>
          <RefreshControl
            onRefresh={() => fetchLiveData()}
            refreshing={loading}
            lastUpdated={lastUpdated}
            storageKey="transmission"
            className="hidden sm:flex"
          />
        </div>
      </div>
    </>
  )
}
