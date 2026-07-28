'use client'

import { ScanBarcode, CircleCheck, CircleX } from 'lucide-react'
import type { WarehouseSession } from '../types/warehouse.types'

interface WarehouseSessionStatsProps {
  currentSession: WarehouseSession
}

export function WarehouseSessionStats({ currentSession }: WarehouseSessionStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {/* Mobile: centered col, no icon. Desktop: original — icon left, left-aligned text */}
      <div className="relative overflow-hidden rounded-2xl border shadow-sm ring-1 ring-black/5 bg-card p-4 sm:p-5 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-primary"></div>
        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 shrink-0">
          <ScanBarcode className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] text-primary sm:text-muted-foreground font-medium uppercase tracking-widest">Total Scanned</p>
          <p className="text-2xl sm:text-3xl font-black text-primary leading-none mt-1">{currentSession.total_scanned_books}</p>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border shadow-sm ring-1 ring-black/5 bg-card p-4 sm:p-5 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500"></div>
        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shrink-0">
          <CircleCheck className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] text-emerald-500 sm:text-muted-foreground font-medium uppercase tracking-widest">Processable</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-500 leading-none mt-1">{currentSession.total_processable}</p>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border shadow-sm ring-1 ring-black/5 bg-card p-4 sm:p-5 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-destructive"></div>
        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 shrink-0">
          <CircleX className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] text-destructive sm:text-muted-foreground font-medium uppercase tracking-widest">Non-Processable</p>
          <p className="text-2xl sm:text-3xl font-black text-destructive leading-none mt-1">{currentSession.total_non_processable}</p>
        </div>
      </div>
    </div>
  )
}
