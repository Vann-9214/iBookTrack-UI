'use client'

import { cn } from '@/lib/utils'
import { Loader2, Package, Warehouse, X, CircleCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  return (
    <div className="relative flex flex-col gap-4">
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card rounded-xl">
          <div className="flex items-center gap-3 px-5 py-4 bg-muted/50 border border-border rounded-xl shadow-lg">
            <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-foreground">Completing session...</span>
          </div>
        </div>
      )}

      {isbnLoading && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-card border border-primary/30 rounded-xl shadow-lg animate-in slide-in-from-bottom-3 fade-in duration-200">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <div>
            <p className="text-sm font-semibold text-foreground">Adding ISBN...</p>
            <p className="text-xs text-muted-foreground">Verifying with iLMS</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
            <Warehouse className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
              Warehouse Receiving
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
              Active scanning session for <span className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none", brand === 'jaguar' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600')}>{brand}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Active session banner */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Top accent strip */}
        <div className="h-0.5 w-full bg-primary/80" />
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
          {/* Info */}
          <div className="flex items-start gap-3 sm:gap-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center divide-x divide-border min-w-0">
              <div className="pr-3 sm:pr-5 shrink-0">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Lot</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{activeLot}</p>
              </div>
              {currentBoxNumber && (
                <div className="px-3 sm:px-5 shrink-0">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Box</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{currentBoxNumber}</p>
                  <p className="text-[10px] text-muted-foreground">{currentBoxBooks} books</p>
                </div>
              )}
              <div className="pl-3 sm:pl-5 min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Operator</p>
                <p className="text-sm font-bold text-foreground mt-0.5 truncate">{userName || 'Unknown'}</p>
              </div>
            </div>
          </div>
          {/* Buttons */}
          <div className="flex gap-2 shrink-0">
            <button onClick={handleResetSession}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-sm rounded-lg border border-red-400 text-red-500 hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all">
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
            {scannedBooks.length === 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1 sm:flex-none inline-flex">
                    <button
                      onClick={handleCloseSession}
                      disabled
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      <CircleCheck className="h-3.5 w-3.5" />
                      Complete Session
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8} variant="destructive">
                  Scan at least one book first
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={handleCloseSession}
                disabled={loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <CircleCheck className="h-3.5 w-3.5" />
                Complete Session
              </button>
            )}
          </div>
        </div>
      </div>

      {children}
    </div>
  )
}
