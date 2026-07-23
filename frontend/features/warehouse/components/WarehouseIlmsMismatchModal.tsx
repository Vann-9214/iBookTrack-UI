'use client'

import { AlertTriangle, X } from 'lucide-react'
import type { IlmsMismatchModalState } from '../types/warehouse.types'

interface WarehouseIlmsMismatchModalProps {
  ilmsMismatchModal: IlmsMismatchModalState
  setIlmsMismatchModal: (state: IlmsMismatchModalState) => void
}

export function WarehouseIlmsMismatchModal({
  ilmsMismatchModal,
  setIlmsMismatchModal,
}: WarehouseIlmsMismatchModalProps) {
  if (!ilmsMismatchModal.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIlmsMismatchModal({ open: false, isbn: '', title: '', expectedLot: '', expectedBox: '', ilmsLot: '', ilmsBox: '', onConfirm: () => {} })}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Lot / Box Mismatch</h3>
              <p className="text-[11px] text-muted-foreground">iLMS data differs from session</p>
            </div>
          </div>
          <button
            onClick={() => setIlmsMismatchModal({ open: false, isbn: '', title: '', expectedLot: '', expectedBox: '', ilmsLot: '', ilmsBox: '', onConfirm: () => {} })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            ISBN <span className="font-semibold text-foreground">{ilmsMismatchModal.isbn}</span> ({ilmsMismatchModal.title || 'Unknown Title'}) in iLMS belongs to:
          </p>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1 text-sm">
            <p className="text-foreground"><span className="font-medium text-muted-foreground">Lot:</span> {ilmsMismatchModal.ilmsLot || '—'}</p>
            <p className="text-foreground"><span className="font-medium text-muted-foreground">Box:</span> {ilmsMismatchModal.ilmsBox || '—'}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            But your current session is set to <span className="font-semibold text-foreground">{ilmsMismatchModal.expectedLot}</span> / <span className="font-semibold text-foreground">{ilmsMismatchModal.expectedBox}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Are you sure this is the right book?
          </p>
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
          <button
            onClick={() => setIlmsMismatchModal({ open: false, isbn: '', title: '', expectedLot: '', expectedBox: '', ilmsLot: '', ilmsBox: '', onConfirm: () => {} })}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { setIlmsMismatchModal({ open: false, isbn: '', title: '', expectedLot: '', expectedBox: '', ilmsLot: '', ilmsBox: '', onConfirm: () => {} }); ilmsMismatchModal.onConfirm() }}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
