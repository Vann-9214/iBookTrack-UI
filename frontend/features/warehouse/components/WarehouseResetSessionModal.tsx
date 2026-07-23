'use client'

import { AlertTriangle, Trash2, X } from 'lucide-react'

interface WarehouseResetSessionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function WarehouseResetSessionModal({ open, onClose, onConfirm }: WarehouseResetSessionModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Reset Session</h3>
              <p className="text-[11px] text-muted-foreground">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">All scanned books in this session will be permanently discarded. The box will be removed and the lot count will be updated.</p>
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={onConfirm} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
            Reset Session
          </button>
        </div>
      </div>
    </div>
  )
}
