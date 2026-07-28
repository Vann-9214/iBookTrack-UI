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
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
          <div className={cn(
            "flex items-center gap-3 px-5 py-4 bg-card border rounded-xl shadow-lg",
            brand === 'jaguar' ? "border-emerald-200 shadow-emerald-900/5" : "border-blue-200 shadow-blue-900/5"
          )}>
            <span className={cn(
              "w-6 h-6 rounded-full border-2 border-t-transparent animate-spin",
              brand === 'jaguar' ? "border-emerald-600" : "border-blue-600"
            )} />
            <span className="text-sm font-semibold text-foreground">Completing session...</span>
          </div>
        </div>
      )}

      {isbnLoading && (
        <div className={cn(
          "fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-card border rounded-xl shadow-lg animate-in slide-in-from-bottom-3 fade-in duration-200",
          brand === 'jaguar' ? "border-emerald-500/30" : "border-blue-500/30"
        )}>
          <Loader2 className={cn("h-4 w-4 animate-spin", brand === 'jaguar' ? "text-emerald-500" : "text-blue-500")} />
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
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2.5 px-3 sm:px-4 rounded-xl border",
        brand === 'jaguar'
          ? "bg-emerald-50 border-emerald-200"
          : "bg-blue-50 border-blue-200"
      )}>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
            brand === 'jaguar' ? "bg-emerald-100/50 text-emerald-600" : "bg-blue-100/50 text-blue-600"
          )}>
            <Package className="h-5 w-5" />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Lot</span>
              <span className={cn("text-sm font-bold", brand === 'jaguar' ? "text-emerald-600" : "text-blue-600")}>{activeLot}</span>
            </div>
            
            {currentBoxNumber && (
              <>
                <div className={cn("w-px h-8", brand === 'jaguar' ? "bg-emerald-200/50" : "bg-blue-200/50")} />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Box</span>
                  <span className={cn("text-sm font-bold", brand === 'jaguar' ? "text-emerald-600" : "text-blue-600")}>{currentBoxNumber}</span>
                </div>
              </>
            )}

            <div className={cn("w-px h-8 hidden sm:block", brand === 'jaguar' ? "bg-emerald-200/50" : "bg-blue-200/50")} />
            
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Operator</span>
              <span className={cn("text-sm font-bold truncate max-w-[150px]", brand === 'jaguar' ? "text-emerald-600" : "text-blue-600")}>{userName || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button onClick={handleResetSession}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg border bg-white hover:bg-red-50 text-red-500 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm">
            <X className="h-4 w-4" />
            Reset
          </button>
          
          <button
            onClick={handleCloseSession}
            disabled={loading || scannedBooks.length === 0}
            className={cn(
              "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
              brand === 'jaguar' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <CircleCheck className="h-4 w-4" />
            Complete Session
          </button>
        </div>
      </div>

      {children}
    </div>
  )
}
