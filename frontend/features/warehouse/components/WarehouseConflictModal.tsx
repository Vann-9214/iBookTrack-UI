'use client'

import { AlertTriangle, X } from 'lucide-react'
import type { ConflictModalState } from '../types/warehouse.types'

interface WarehouseConflictModalProps {
  conflictModalState: ConflictModalState
  setConflictModalState: (state: ConflictModalState) => void
  handleNewSession: (force: boolean) => void
}

export function WarehouseConflictModal({
  conflictModalState,
  setConflictModalState,
  handleNewSession,
}: WarehouseConflictModalProps) {
  if (!conflictModalState.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConflictModalState({ open: false, type: null, message: '' })}>
      <div className="animate-modal-origin bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${conflictModalState.type === 'has_books' ? 'bg-destructive/10' : 'bg-amber-500/10'}`}>
              <AlertTriangle className={`h-4 w-4 ${conflictModalState.type === 'has_books' ? 'text-destructive' : 'text-amber-500'}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {conflictModalState.type === 'has_books' ? 'Cannot Start Session' : 'Box Already Exists'}
              </h3>
              <p className="text-[11px] text-muted-foreground">Action Required</p>
            </div>
          </div>
          <button
            onClick={() => setConflictModalState({ open: false, type: null, message: '' })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">{conflictModalState.message}</p>
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
          {conflictModalState.type === 'zero_books' ? (
            <>
              <button onClick={() => setConflictModalState({ open: false, type: null, message: '' })} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => { setConflictModalState({ open: false, type: null, message: '' }); handleNewSession(true) }} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors">Retry Again</button>
            </>
          ) : (
            <button onClick={() => setConflictModalState({ open: false, type: null, message: '' })} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted font-medium transition-colors">Close</button>
          )}
        </div>
      </div>
    </div>
  )
}
