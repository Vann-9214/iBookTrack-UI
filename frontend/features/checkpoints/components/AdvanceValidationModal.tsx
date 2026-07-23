import { X } from 'lucide-react'
import type { AdvanceError } from '../types/checkpoints.types'

interface AdvanceValidationModalProps {
  advanceError: AdvanceError
  onClose: () => void
}

export function AdvanceValidationModal({ advanceError, onClose }: AdvanceValidationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
          <X className="h-4 w-4 text-destructive" /> Cannot Advance Box
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          <span className="font-semibold text-foreground">{advanceError.box.box_number}</span>{' '}
          cannot move to Transmission because not all processable ISBNs are verified in Simflex.
        </p>
        <div className="bg-muted/40 rounded-lg border border-border p-3 mb-4 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-foreground mb-2">Pending ISBNs:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {advanceError.pending_isbns.map((isbn) => (
              <li key={isbn}>{isbn}</li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
