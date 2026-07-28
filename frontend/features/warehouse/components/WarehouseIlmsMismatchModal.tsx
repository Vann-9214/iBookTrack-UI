'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IlmsMismatchModalState } from '../types/warehouse.types'

interface WarehouseIlmsMismatchModalProps {
  ilmsMismatchModal: IlmsMismatchModalState
  setIlmsMismatchModal: (state: IlmsMismatchModalState) => void
}

export function WarehouseIlmsMismatchModal({
  ilmsMismatchModal,
  setIlmsMismatchModal,
}: WarehouseIlmsMismatchModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const theme = {
    border: 'border-amber-200/80',
    header: 'border-amber-100 bg-gradient-to-r from-amber-50 via-card to-amber-50/60',
    hover: 'hover:bg-amber-100/70',
    surface: 'border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-100/50',
    surfaceLabel: 'text-amber-800',
    detail: 'border-amber-200/70 bg-white/80',
    footer: 'border-amber-100 bg-gradient-to-r from-amber-50/60 via-card to-amber-50/60',
  }
  const close = (onClosed?: () => void) => {
    if (isClosing) return
    setIsClosing(true)
    window.setTimeout(() => {
      setIlmsMismatchModal({ open: false, isbn: '', title: '', expectedLot: '', expectedBox: '', ilmsLot: '', ilmsBox: '', onConfirm: () => {} })
      setIsClosing(false)
      onClosed?.()
    }, 220)
  }

  if (!ilmsMismatchModal.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={() => close()}>
      <div className={cn('w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-slate-950/20 ring-1 ring-black/5', isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade', theme.border)} onClick={(e) => e.stopPropagation()}>
        <div className={cn('flex items-center justify-between border-b bg-gradient-to-r px-5 py-4 sm:px-6', theme.header)}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shadow-sm ring-1 ring-amber-200/80">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">Review required</p>
              <h3 className="mt-0.5 text-base font-black tracking-tight text-foreground">Lot / Box Mismatch</h3>
            </div>
          </div>
          <button onClick={() => close()} className={cn('rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground', theme.hover)} aria-label="Close mismatch dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className={cn('rounded-xl border px-4 py-3.5', theme.surface)}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider', theme.surfaceLabel)}>Scanned book</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ISBN</p>
                <p className="mt-1 text-sm font-bold text-foreground">{ilmsMismatchModal.isbn}</p>
              </div>
              <div className="border-t border-amber-200/80 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</p>
                <p className="mt-1 text-sm leading-5 text-foreground/80">{ilmsMismatchModal.title || 'Unknown Title'}</p>
              </div>
            </div>
          </div>

          <div className={cn('rounded-xl border p-4', theme.surface)}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider', theme.surfaceLabel)}>iLMS assignment</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className={cn('rounded-lg border px-3 py-2.5', theme.detail)}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lot</p>
                <p className="mt-1 truncate text-sm font-bold text-foreground">{ilmsMismatchModal.ilmsLot || '—'}</p>
              </div>
              <div className={cn('rounded-lg border px-3 py-2.5', theme.detail)}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Box</p>
                <p className="mt-1 truncate text-sm font-bold text-foreground">{ilmsMismatchModal.ilmsBox || '—'}</p>
              </div>
            </div>
          </div>

          <div className={cn('rounded-xl border px-4 py-3.5', theme.surface)}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider', theme.surfaceLabel)}>Current warehouse session</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              You are scanning into <span className="font-bold text-foreground">{ilmsMismatchModal.expectedLot}</span>
              <span className="text-foreground/60"> / </span>
              <span className="font-bold text-foreground">{ilmsMismatchModal.expectedBox}</span>.
            </p>
          </div>

          <p className="text-sm font-medium text-foreground">Confirm only if this is the correct book for the current session.</p>
        </div>

        <div className={cn('flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6', theme.footer)}>
          <button onClick={() => close()} className="rounded-xl border border-amber-200/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-amber-50 hover:text-foreground">
            Cancel
          </button>
          <button onClick={() => close(ilmsMismatchModal.onConfirm)} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:from-amber-600 hover:to-orange-600">
            Confirm book
          </button>
        </div>
      </div>
    </div>
  )
}
