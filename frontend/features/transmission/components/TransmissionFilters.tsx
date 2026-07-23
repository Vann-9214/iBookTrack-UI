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
      {/* Mobile layout: left col = From/To, right col = icons + checkbox */}
      <div className="flex gap-3 sm:hidden justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-7 shrink-0">From</span>
            <Popover open={fromDateOpenMobile} onOpenChange={setFromDateOpenMobile} modal>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {fromDate ? format(new Date(fromDate), 'MMM dd, yyyy') : 'Pick date'}
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-7 shrink-0">To</span>
            <Popover open={toDateOpenMobile} onOpenChange={setToDateOpenMobile} modal>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-36 justify-start text-left font-normal text-xs">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {toDate ? format(new Date(toDate), 'MMM dd, yyyy') : 'Pick date'}
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
        <div className="flex flex-col gap-1.5 items-end justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="h-8 w-8 p-0"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenRanking} className="h-8 w-8 p-0">
              <Trophy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {NewProcessCheckbox}
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
