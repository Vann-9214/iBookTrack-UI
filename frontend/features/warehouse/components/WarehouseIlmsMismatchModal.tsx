'use client'

import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import type { IlmsMismatchModalState } from '../types/warehouse.types'

interface WarehouseIlmsMismatchModalProps {
  ilmsMismatchModal: IlmsMismatchModalState
  setIlmsMismatchModal: (state: IlmsMismatchModalState) => void
}

export function WarehouseIlmsMismatchModal({
  ilmsMismatchModal,
  setIlmsMismatchModal,
}: WarehouseIlmsMismatchModalProps) {
  const { brand } = useBrand()
  const isJaguar = brand === 'jaguar'
  const theme = isJaguar
    ? {
        border: 'border-emerald-200/80',
        header: 'border-emerald-100 bg-gradient-to-r from-emerald-50 via-card to-card',
        hover: 'hover:bg-emerald-100/70',
        surface: 'border-emerald-200/80 bg-emerald-50/70',
        surfaceLabel: 'text-emerald-700',
        detail: 'border-emerald-100 bg-card/85',
        footer: 'border-emerald-100 bg-emerald-50/45',
      }
    : {
        border: 'border-blue-200/80',
        header: 'border-blue-100 bg-gradient-to-r from-blue-50 via-card to-card',
        hover: 'hover:bg-blue-100/70',
        surface: 'border-blue-200/80 bg-blue-50/70',
        surfaceLabel: 'text-blue-700',
        detail: 'border-blue-100 bg-card/85',
        footer: 'border-blue-100 bg-blue-50/45',
      }
  const dismiss = () => setIlmsMismatchModal({ open: false, isbn: '', title: '', expectedLot: '', expectedBox: '', ilmsLot: '', ilmsBox: '', onConfirm: () => {} })

  if (!ilmsMismatchModal.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={dismiss}>
      <div className={cn('w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-slate-950/20 ring-1 ring-black/5', theme.border)} onClick={(e) => e.stopPropagation()}>
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
          <button onClick={dismiss} className={cn('rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground', theme.hover)} aria-label="Close mismatch dialog">
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
              <div className={cn('border-t pt-3', isJaguar ? 'border-emerald-200/80' : 'border-blue-200/80')}>
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
          <button onClick={dismiss} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Cancel
          </button>
          <button onClick={() => { dismiss(); ilmsMismatchModal.onConfirm() }} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]">
            Confirm book
          </button>
        </div>
      </div>
    </div>
  )
}
