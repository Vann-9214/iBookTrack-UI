import { Loader2, Trash2 } from 'lucide-react'

export function InventoryDeleteModal({
  boxNumber,
  deleting,
  onCancel,
  onConfirm,
}: {
  boxNumber: string
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
      <div className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-destructive/10 rounded-full p-2"><Trash2 className="h-5 w-5 text-destructive" /></div>
          <div>
            <p className="font-semibold text-foreground">Delete Box</p>
            <p className="text-xs text-muted-foreground mt-0.5">This cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-foreground">
          Permanently delete <span className="font-semibold">{boxNumber}</span> and all its scan records, storage assignments, and pipeline events?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-2"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
