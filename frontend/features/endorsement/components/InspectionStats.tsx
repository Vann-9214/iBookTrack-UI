import { ScanBarcode, CircleCheck, CircleX } from 'lucide-react'
import type { InspSession } from '../types/endorsement.types'

interface InspectionStatsProps {
  inspCurrentSession: InspSession | null
}

export function InspectionStats({ inspCurrentSession }: InspectionStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-4 flex items-center gap-3">
        <div className="premium-gradient-ui-card__icon w-9 h-9 shrink-0">
          <ScanBarcode className="h-4 w-4" />
        </div>
        <div>
          <p className="premium-gradient-ui-card__eyebrow">Total Scanned</p>
          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_scanned_books || 0}</p>
        </div>
      </div>
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25">
          <CircleCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="premium-gradient-ui-card__eyebrow">Processable</p>
          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_processable || 0}</p>
        </div>
      </div>
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border rounded-2xl p-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25">
          <CircleX className="h-4 w-4" />
        </div>
        <div>
          <p className="premium-gradient-ui-card__eyebrow">Non-Processable</p>
          <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{inspCurrentSession?.total_non_processable || 0}</p>
        </div>
      </div>
    </div>
  )
}
