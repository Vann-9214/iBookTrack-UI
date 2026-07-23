import { STAGE_LABELS } from '../utils/checkpoints.helpers'
import type { UndoEntry } from '../types/checkpoints.types'

interface UndoTransitionToastProps {
  undoEntry: UndoEntry
  onUndo: () => void
  onDismiss: () => void
}

export function UndoTransitionToast({ undoEntry, onUndo, onDismiss }: UndoTransitionToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <span className="text-foreground">
        <span className="font-semibold">{undoEntry.box.box_number}</span> moved to{' '}
        <span className="font-semibold capitalize">{STAGE_LABELS[undoEntry.toStage]}</span>
      </span>
      <button
        onClick={onUndo}
        className="ml-2 px-3 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 text-xs font-semibold transition-colors"
      >
        Undo
      </button>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
        ✕
      </button>
    </div>
  )
}
