'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Package, Warehouse, X, CircleCheck, BookOpen } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IsbnConverterModal } from '@/components/isbn-converter-modal'
import type { ScannedBook, WarehouseSession } from '../types/warehouse.types'

interface WarehouseActiveSessionProps {
  brand: string
  activeLot: string
  currentBoxNumber: string
  currentBoxBooks: number
  userName: string
  loading: boolean
  isbnLoading: boolean
  scannedBooks: ScannedBook[]
  currentSession: WarehouseSession
  handleResetSession: () => void
  handleCloseSession: () => void
  children: React.ReactNode
}

export function WarehouseActiveSession({
  brand,
  activeLot,
  currentBoxNumber,
  currentBoxBooks,
  userName,
  loading,
  isbnLoading,
  scannedBooks,
  currentSession,
  handleResetSession,
  handleCloseSession,
  children,
}: WarehouseActiveSessionProps) {
  const [showIsbnModal, setShowIsbnModal] = useState(false)
  const labelTheme = 'text-primary/75'
  const valueTheme = 'text-primary'
  const iconTheme = 'premium-gradient-ui-card--solid'

  return (
    <div className="relative flex flex-col gap-4">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[3px] rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Completing session…</span>
          </div>
        </div>
      )}

      {isbnLoading && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-card border border-primary/30 rounded-xl shadow-lg animate-in slide-in-from-bottom-3 fade-in duration-200">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Adding ISBN...</p>
            <p className="text-xs text-muted-foreground">Verifying with iLMS</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={cn('relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ring-1 ring-black/5', iconTheme)}>
            <Warehouse className="h-7 w-7" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black leading-none tracking-tighter text-foreground sm:text-3xl">Warehouse Receiving</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-muted-foreground sm:text-[13px]">
              <span>Active scanning session</span>
              <span className="text-muted-foreground/40">•</span>
              <span className={cn('inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm leading-none', iconTheme)}>{brand}</span>

            </div>
          </div>
        </div>
      </div>

      {/* Active session banner */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 px-3 sm:px-4 rounded-2xl border shadow-sm ring-1 bg-white/68 border-primary/15 ring-primary/10">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg', iconTheme)}>
            <Package className="h-5 w-5" />
          </div>
          
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-5">
            <div className="min-w-[64px]">
              <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Lot</span>
              <span className={cn('mt-0.5 block truncate text-sm font-semibold tracking-tight', valueTheme)}>{activeLot}</span>
            </div>
            
            {currentBoxNumber && (
              <>
                <div className="hidden h-7 w-px sm:block bg-primary/10" />
                <div className="min-w-[52px]">
                  <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Box</span>
                  <span className={cn('mt-0.5 block text-sm font-semibold tracking-tight', valueTheme)}>{currentBoxNumber}</span>
                </div>
              </>
            )}

            <div className="hidden h-7 w-px sm:block bg-primary/10" />
            <div className="min-w-[112px] flex-1 sm:flex-none">
              <span className={cn('block text-[9px] font-semibold uppercase tracking-[0.1em]', labelTheme)}>Operator</span>
              <span className={cn('mt-0.5 block truncate text-sm font-semibold tracking-tight', valueTheme)}>{userName || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex w-full shrink-0 gap-2 sm:w-auto">
          <button onClick={() => setShowIsbnModal(true)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-2 py-3 text-[11px] sm:text-xs sm:px-4 font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/10 sm:flex-none">
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Convert
          </button>
          
          <button onClick={handleResetSession}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200/80 bg-white/80 px-2 py-3 text-[11px] sm:text-xs sm:px-4 font-semibold text-red-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-red-200/40 sm:flex-none">
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Reset
          </button>
          
          <button
            onClick={handleCloseSession}
            disabled={loading || scannedBooks.length === 0}
            className="col-span-2 sm:col-span-1 inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-xs font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:flex-none premium-gradient-ui-card--solid"
          >
            <CircleCheck className="h-4 w-4" />
            Complete Session
          </button>
        </div>
      </div>

      {children}
      
      <IsbnConverterModal 
        open={showIsbnModal} 
        onClose={() => setShowIsbnModal(false)} 
        brand={brand}
      />
    </div>
  )
}
