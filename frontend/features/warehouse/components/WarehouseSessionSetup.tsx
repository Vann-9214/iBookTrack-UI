'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { ChevronsUpDown, Package, ScanBarcode, Check, Lock } from 'lucide-react'
import type { Lot } from '../types/warehouse.types'
import { WarehouseSessionSetupSkeleton } from './WarehouseSessionSetupSkeleton'

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

  if (lotsLoading) return <WarehouseSessionSetupSkeleton />

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
          <div className="flex items-center gap-3 px-6 py-3.5 bg-card border border-border rounded-full shadow-lg">
            <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm font-bold text-foreground">Starting session...</span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {/* Card header row */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg text-white shadow-sm shrink-0",
            brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          )}>
            <ScanBarcode className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-black tracking-tight text-foreground leading-none">Start Receiving Session</h2>
            <p className="text-[12px] font-medium text-muted-foreground mt-0.5">Select a lot and box number, then start scanning.</p>
          </div>
        </div>

        {/* Form row — all inline on desktop */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          {/* Lot input */}
          <div className="flex flex-col gap-1 w-full sm:w-[240px]">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Lot Number
              {activeLot && !lotsLoading && <span className="text-primary font-bold text-[10px]">✓</span>}
            </label>
            <Popover open={lotOpen} onOpenChange={setLotOpen}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Input
                    placeholder="Type or search lot..."
                    value={activeLot}
                    onChange={(e) => { setActiveLot(e.target.value); setLotOpen(true); setSessionError(null) }}
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
                    className="h-9 pr-10 bg-background text-sm font-medium shadow-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  />
                  <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 shrink-0 opacity-40 pointer-events-none" />
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
          </div>

          {/* Box input */}
          <div className="flex flex-col gap-1 w-full sm:w-[160px]">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Box Number
              {selectedBox && <span className="text-primary font-bold text-[10px]">✓</span>}
            </label>
            <Input
              ref={boxInputRef}
              placeholder="e.g. 181/264"
              value={selectedBox}
              onChange={(e) => { const val = e.target.value; if (/^[0-9/]*$/.test(val)) { setSelectedBox(val); setSessionError(null) } }}
              disabled={!activeLot}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && activeLot && selectedBox && !boxLockedBy) {
                  e.preventDefault()
                  handleNewSession(false)
                }
              }}
              className="h-9 bg-background text-sm font-medium shadow-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Start button */}
          <Button
            onClick={() => handleNewSession(false)}
            disabled={loading || !activeLot || !selectedBox || lotsLoading || !!boxLockedBy}
            className={cn(
              "w-full sm:w-auto h-9 px-5 text-sm font-bold shadow-md transition-all hover:shadow-lg disabled:hover:shadow-none shrink-0",
              brand === 'jaguar'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
            )}
          >
            <ScanBarcode className="h-4 w-4 mr-2" />
            Start Scanning
          </Button>
        </div>

        {/* Status feedback strip */}
        {boxLockedBy && (
          <div className="flex items-center gap-2.5 mt-3 py-2 px-3.5 bg-destructive/10 border border-destructive/20 rounded-lg text-[13px] font-bold text-destructive animate-in fade-in zoom-in-95 duration-200">
            <Lock className="h-4 w-4 shrink-0" />
            <span>This box is currently being processed by <span className="underline underline-offset-2">{boxLockedBy}</span>.</span>
          </div>
        )}
        {activeLot && selectedBox && !boxLockedBy && (
          <div className="flex items-center gap-2.5 mt-3 py-2 px-3.5 bg-primary/5 border border-primary/10 rounded-lg text-[13px] font-semibold text-primary animate-in fade-in zoom-in-95 duration-200">
            <Package className="h-4 w-4 opacity-70" />
            <span>{activeLot.toLowerCase().startsWith('lot') ? activeLot : `Lot ${activeLot}`}</span>
            <span className="text-primary/30">→</span>
            <span>Box {selectedBox}</span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary/60">Ready to scan</span>
          </div>
        )}
      </div>
    </div>
  )
}
