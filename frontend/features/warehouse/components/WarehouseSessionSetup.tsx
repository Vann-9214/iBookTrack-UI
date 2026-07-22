'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ChevronsUpDown, Package, ScanBarcode, Check } from 'lucide-react'
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
}: WarehouseSessionSetupProps) {
  const [lotOpen, setLotOpen] = useState(false)
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-10 min-h-[500px]">
      {lotsLoading ? (
        <WarehouseSessionSetupSkeleton />
      ) : (
        <div className="flex flex-col items-center w-full max-w-2xl">
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tighter text-foreground">Warehouse Receiving</h1>
            <p className="text-sm font-medium text-muted-foreground">
              Select a lot and box to initialize a new scanning session for{' '}
              <span className={cn(
                "inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none",
                brand === 'jaguar'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              )}>
                {brand}
              </span>
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl shadow-lg shadow-black/5 ring-1 ring-black/5 w-full overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary/80" />
            {loading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card">
                <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border border-border rounded-xl shadow-lg">
                  <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-sm font-semibold text-foreground">Starting session...</span>
                </div>
              </div>
            )}
            <div className="p-8 md:p-10">
              <div className="flex items-center gap-5 mb-8">
                <div className={cn("flex items-center justify-center w-14 h-14 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                  <Package className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">Start Receiving Session</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-1.5">Select a lot and box to begin scanning books into inventory.</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-xl bg-muted/40 border border-border shadow-inner shadow-black/[0.02]">
                  <div className="flex flex-col gap-2.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                      Lot Number
                      {activeLot && !lotsLoading && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">SELECTED</span>}
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
                                if (activeLot && selectedBox) {
                                  handleNewSession(false)
                                } else {
                                  setTimeout(() => boxInputRef.current?.focus(), 0)
                                }
                              }
                            }}
                            onFocus={() => setLotOpen(true)}
                            disabled={lotsLoading}
                            className="h-11 pr-10 bg-background text-sm shadow-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                          />
                          <ChevronsUpDown className="absolute right-3 top-3.5 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                        </div>
                      </PopoverAnchor>
                      <PopoverContent className="w-[280px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                  <div className="flex flex-col gap-2.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                      Box Number
                      {selectedBox && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">SELECTED</span>}
                    </label>
                    <Input
                      ref={boxInputRef}
                      placeholder="e.g. 181/264"
                      value={selectedBox}
                      onChange={(e) => { const val = e.target.value; if (/^[0-9/]*$/.test(val)) { setSelectedBox(val); setSessionError(null) } }}
                      disabled={!activeLot}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && activeLot && selectedBox) {
                          e.preventDefault()
                          handleNewSession(false)
                        }
                      }}
                      className="h-11 bg-background text-sm shadow-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
                {activeLot && selectedBox && (
                  <div className="flex items-center justify-center gap-2.5 py-3 px-4 bg-primary/5 border border-primary/10 rounded-xl text-sm font-semibold text-primary animate-in fade-in zoom-in-95 duration-200">
                    <Package className="h-4 w-4 opacity-70" />
                    <span>{activeLot.toLowerCase().startsWith('lot') ? activeLot : `Lot ${activeLot}`}</span>
                    <span className="text-primary/30">•</span>
                    <span>Box {selectedBox}</span>
                  </div>
                )}
                <Button
                  onClick={() => handleNewSession(false)}
                  disabled={loading || !activeLot || !selectedBox || lotsLoading}
                  className="w-full h-12 text-sm font-bold shadow-md transition-all hover:shadow-lg disabled:hover:shadow-none bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Starting Session...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ScanBarcode className="h-5 w-5" />
                      Start Scanning Session
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
