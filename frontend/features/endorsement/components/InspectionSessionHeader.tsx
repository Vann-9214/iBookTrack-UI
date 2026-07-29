import { Package } from 'lucide-react'
import type { BoxEntry } from '../types/endorsement.types'

interface InspectionSessionHeaderProps {
  inspBox: BoxEntry
  inspCurrentBoxBooks: number
  inspUserName: string
  loadingInspSession: boolean
  inspScannedBooksLength: number
  handleResetInspSession: () => void
  handleOpenInspComplete: () => void
}

export function InspectionSessionHeader({
  inspBox,
  inspCurrentBoxBooks,
  inspUserName,
  loadingInspSession,
  inspScannedBooksLength,
  handleResetInspSession,
  handleOpenInspComplete,
}: InspectionSessionHeaderProps) {
  return (
    <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl p-4 sm:p-5">
      <div className="premium-gradient-ui-card__glow" />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="premium-gradient-ui-card__icon w-9 h-9 shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Active Lot</p>
              <p className="text-sm font-semibold text-foreground">{inspBox.lot?.lot_number || '—'}</p>
            </div>
            {inspBox.box_number && (
              <div>
                <p className="text-xs text-muted-foreground">Current Box</p>
                <p className="text-sm font-semibold text-foreground">{inspBox.box_number} ({inspCurrentBoxBooks} books)</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">User</p>
              <p className="text-sm font-semibold text-foreground">{inspUserName || 'Unknown User'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResetInspSession}
            className="px-4 py-1.5 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
          >
            Reset Session
          </button>
          <button
            onClick={handleOpenInspComplete}
            disabled={loadingInspSession || inspScannedBooksLength === 0}
            className="px-4 py-1.5 text-sm rounded-lg premium-gradient-ui-card--solid text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Session
          </button>
        </div>
      </div>
    </div>
  )
}
