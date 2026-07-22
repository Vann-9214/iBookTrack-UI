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
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left">
        <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
          <ScanBarcode className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] text-primary sm:text-muted-foreground font-medium uppercase tracking-wide">Total Scanned</p>
          <p className="text-xl sm:text-2xl font-bold text-primary sm:text-foreground leading-none mt-0.5">{currentSession.total_scanned_books}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left">
        <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
          <CircleCheck className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] text-emerald-500 sm:text-muted-foreground font-medium uppercase tracking-wide">Processable</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-500 sm:text-foreground leading-none mt-0.5">{currentSession.total_processable}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left">
        <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
          <CircleX className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] text-destructive sm:text-muted-foreground font-medium uppercase tracking-wide">Non-Processable</p>
          <p className="text-xl sm:text-2xl font-bold text-destructive sm:text-foreground leading-none mt-0.5">{currentSession.total_non_processable}</p>
        </div>
      </div>
    </div>
  )
}
