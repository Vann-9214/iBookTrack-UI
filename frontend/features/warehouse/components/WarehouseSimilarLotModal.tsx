'use client'

import { AlertTriangle, X } from 'lucide-react'
import type { SimilarLotModalState } from '../types/warehouse.types'

interface WarehouseSimilarLotModalProps {
  similarLotModal: SimilarLotModalState
  setSimilarLotModal: (state: SimilarLotModalState) => void
  setActiveLot: (lot: string) => void
}

export function WarehouseSimilarLotModal({
  similarLotModal,
  setSimilarLotModal,
  setActiveLot,
}: WarehouseSimilarLotModalProps) {
  if (!similarLotModal.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSimilarLotModal({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} })}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Similar Lot Found</h3>
              <p className="text-[11px] text-muted-foreground">Check lot name</p>
            </div>
          </div>
          <button
            onClick={() => setSimilarLotModal({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{similarLotModal.typedLot}</span> is similar to the existing lot <span className="font-semibold text-foreground">{similarLotModal.matchedLot}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Is this the same lot? If so, use the existing name. If not, continue with the new name.
          </p>
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
          <button
            onClick={() => { setActiveLot(similarLotModal.matchedLot); setSimilarLotModal({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} }) }}
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted font-medium transition-colors"
          >
            Use {similarLotModal.matchedLot}
          </button>
          <button
            onClick={() => { setSimilarLotModal({ open: false, typedLot: '', matchedLot: '', onContinue: () => {} }); similarLotModal.onContinue() }}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
