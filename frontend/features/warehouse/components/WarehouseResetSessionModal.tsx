'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WarehouseResetSessionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function WarehouseResetSessionModal({ open, onClose, onConfirm }: WarehouseResetSessionModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const close = () => {
    if (isClosing || isResetting) return
    setIsClosing(true)
    window.setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 360)
  }
  const confirmReset = async () => {
    if (isResetting) return
    setIsResetting(true)
    try {
      await onConfirm()
    } finally {
      setIsResetting(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={() => close()}>
      <div data-modal-origin-surface className={cn('w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-slate-950/20 ring-1 ring-black/5', isClosing ? 'animate-modal-origin-out' : 'animate-modal-origin', 'border-rose-200/80')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-rose-100 bg-gradient-to-r from-rose-50 via-card to-rose-50/60 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 shadow-sm ring-1 ring-rose-200/80">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600">Destructive action</p>
              <h3 className="mt-0.5 text-base font-black tracking-tight text-foreground">Reset Session</h3>
            </div>
          </div>
          <button onClick={close} disabled={isResetting} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-rose-100/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close reset dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-red-100/50 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-rose-200/70 bg-white/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">What will happen</p>
            <p className="mt-2 text-sm leading-6 text-foreground/80">All scanned books in this session will be permanently discarded. The box will be removed and the lot count will be updated.</p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-rose-100 bg-gradient-to-r from-rose-50/60 via-card to-red-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button onClick={close} disabled={isResetting} className="rounded-xl border border-rose-200/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-rose-50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button onClick={confirmReset} disabled={isResetting} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:-translate-y-0.5 hover:from-rose-600 hover:to-red-700 disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0">
            {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isResetting ? 'Resetting session...' : 'Reset Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
