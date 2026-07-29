'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { ChevronsUpDown, ScanBarcode, Check, Lock } from 'lucide-react'
import type { Lot } from '../types/warehouse.types'
import { Skeleton } from '@/components/ui/skeleton'
interface WarehouseSessionSetupProps {
  brand: string
  lots: Lot[]
  lotsLoading: boolean
  activeLot: string
  setActiveLot: (value: string) => void
  selectedBox: string
  setSelectedBox: (value: string) => void
  loading: boolean
  handleNewSession: (force: boolean) => void
  boxInputRef: React.RefObject<HTMLInputElement | null>
  setSessionError: (error: string | null) => void
  boxLockedBy: string | null
}

export function WarehouseSessionSetup({
  brand,
  lots,
  lotsLoading,
  activeLot,
  setActiveLot,
  selectedBox,
  setSelectedBox,
  loading,
  handleNewSession,
  boxInputRef,
  setSessionError,
  boxLockedBy,
}: WarehouseSessionSetupProps) {
  const [lotOpen, setLotOpen] = useState(false)
  const cardTheme = 'bg-white/68 border border-primary/15 ring-1 ring-primary/10 rounded-2xl'
  const iconTheme = 'premium-gradient-ui-card--solid'
  const textTheme = 'text-primary'
  const labelTheme = 'text-primary/75'
  const borderTheme = 'border-primary/20 focus:ring-primary/20'

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border-2 p-4 sm:p-5 shadow-sm ring-1 transition-all duration-300", cardTheme)}>
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl" />

      <div className="relative">
        {/* Card header row */}
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-lg", iconTheme)}>
            <ScanBarcode className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", textTheme)}>Receiving setup</p>
            <h2 className="text-[16px] font-black tracking-tight leading-none mt-0.5 text-foreground">Start Receiving Session</h2>
            <p className="text-[12px] font-medium mt-0.5 text-primary/80">Select a lot and box number, then start scanning.</p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-primary/10" />

        {/* Form row — all inline on desktop */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          {/* Lot input */}
          <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
            <label className={cn("text-[11px] font-bold uppercase tracking-wider", labelTheme)}>
              Lot Number
            </label>
            {lotsLoading ? (
              <Skeleton className="h-9 w-full rounded-md bg-black/5" />
            ) : (
              <Popover open={lotOpen} onOpenChange={setLotOpen}>
                <PopoverAnchor asChild>
                  <div className="relative group">
                    <Input
                      placeholder="Type or search lot..."
                      value={activeLot}
                      onChange={(e) => {
                        const val = e.target.value
                        setActiveLot(val)
                        setLotOpen(true)
                        setSessionError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          setLotOpen(false)
                          if (activeLot && selectedBox && !boxLockedBy) {
                            handleNewSession(false)
                          } else {
                            setTimeout(() => boxInputRef.current?.focus(), 0)
                          }
                        }
                      }}
                      onFocus={() => setLotOpen(true)}
                      disabled={lotsLoading}
                      className={cn("h-9 pr-10 rounded-lg bg-white/85 shadow-sm ring-1 ring-black/5 transition-all focus:bg-white focus:ring-2", borderTheme)}
                    />
                    <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 shrink-0 opacity-40 pointer-events-none transition-opacity group-hover:opacity-60" />
                  </div>
                </PopoverAnchor>
                <PopoverContent className="w-[280px] p-0 shadow-xl" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Command>
                    <CommandList>
                      <CommandEmpty className="py-4 flex justify-center text-sm">
                        {activeLot ? (
                          <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-md font-medium text-xs tracking-wide">
                            Use custom: {activeLot}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No lot found.</span>
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {lots
                          .filter(l => l.type?.toLowerCase() === brand && String(l.lot_number).toLowerCase().includes(activeLot.toLowerCase()))
                          .slice(0, 10)
                          .map(l => (
                            <CommandItem
                              key={l.lot_number}
                              value={String(l.lot_number)}
                              onSelect={() => { setActiveLot(String(l.lot_number)); setLotOpen(false); setSessionError(null); setTimeout(() => boxInputRef.current?.focus(), 0) }}
                              className="flex justify-between items-center w-full py-2 cursor-pointer"
                            >
                              <span className="font-medium">{String(l.lot_number).toLowerCase().startsWith('lot') ? String(l.lot_number) : `Lot ${String(l.lot_number)}`}</span>
                              <Check className={cn('h-4 w-4 text-primary ml-auto', activeLot === String(l.lot_number) ? 'opacity-100' : 'opacity-0')} />
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Box input */}
          <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
            <label className={cn("text-[11px] font-bold uppercase tracking-wider", labelTheme)}>
              Box Number
            </label>
            {lotsLoading ? (
              <Skeleton className="h-9 w-full rounded-md bg-black/5" />
            ) : (
              <Input
                ref={boxInputRef}
                placeholder="e.g. 181/264"
                value={selectedBox}
                onChange={(e) => {
                  const val = e.target.value
                  if (/^[0-9/]*$/.test(val)) {
                    setSelectedBox(val)
                    setSessionError(null)
                  }
                }}
                disabled={!activeLot}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && activeLot && selectedBox && !boxLockedBy) {
                    e.preventDefault()
                    handleNewSession(false)
                  }
                }}
                className={cn("h-9 rounded-lg bg-white/85 shadow-sm ring-1 ring-black/5 transition-all focus:bg-white focus:ring-2", borderTheme)}
              />
            )}
          </div>

          {/* Start button */}
          <Button
            onClick={() => handleNewSession(false)}
            disabled={loading || !activeLot || !selectedBox || lotsLoading || !!boxLockedBy}
            className="w-full sm:w-auto h-9 px-5 text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:hover:translate-y-0 disabled:hover:shadow-lg shrink-0 rounded-xl text-white premium-gradient-ui-card--solid"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                Starting session...
              </>
            ) : (
              <>
                <ScanBarcode className="h-4 w-4 mr-2" />
                Start Scanning
              </>
            )}
          </Button>
        </div>

        {/* Status feedback strip */}
        {boxLockedBy && (
          <div className="flex items-center gap-2.5 mt-3 py-2 px-3.5 bg-destructive/10 border border-destructive/20 rounded-lg text-[13px] font-bold text-destructive animate-in fade-in zoom-in-95 duration-200">
            <Lock className="h-4 w-4 shrink-0" />
            <span>This box is currently being processed by <span className="underline underline-offset-2">{boxLockedBy}</span>.</span>
          </div>
        )}
      </div>
    </div>
  )
}
