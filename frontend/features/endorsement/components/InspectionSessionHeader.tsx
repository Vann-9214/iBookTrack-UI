import React from 'react'
import { Package } from 'lucide-react'
import { BoxEntry } from '../types/endorsement.types'

interface InspectionSessionHeaderProps {
  inspBox: BoxEntry
  inspCurrentBoxBooks: number
  inspUserName: string
  loadingInspSession: boolean
  inspScannedBooksLength: number
  handleResetInspSession: () => void
  handleOpenInspComplete: () => void
}

export const InspectionSessionHeader: React.FC<InspectionSessionHeaderProps> = ({
  inspBox,
  inspCurrentBoxBooks,
  inspUserName,
  loadingInspSession,
  inspScannedBooksLength,
  handleResetInspSession,
  handleOpenInspComplete,
}) => {
  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4">
      <div className="flex items-center gap-4">
        <Package className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Active Lot</p>
          <p className="text-sm font-semibold text-foreground">{inspBox.lot?.lot_number || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current Box</p>
          <p className="text-sm font-semibold text-foreground">
            {inspBox.box_number} ({inspCurrentBoxBooks} books)
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">User</p>
          <p className="text-sm font-semibold text-foreground">{inspUserName || 'Unknown User'}</p>
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
          className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Complete Session
        </button>
      </div>
    </div>
  )
}
