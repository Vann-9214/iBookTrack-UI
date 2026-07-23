import React from 'react'
import { ScanBarcode, CircleCheck, CircleX } from 'lucide-react'
import { InspSession } from '../types/endorsement.types'

interface InspectionStatsProps {
  inspCurrentSession: InspSession | null
}

export const InspectionStats: React.FC<InspectionStatsProps> = ({ inspCurrentSession }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
          <ScanBarcode className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Scanned</p>
          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_scanned_books || 0}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
          <CircleCheck className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Processable</p>
          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_processable || 0}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
          <CircleX className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Non-Processable</p>
          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_non_processable || 0}</p>
        </div>
      </div>
    </div>
  )
}
