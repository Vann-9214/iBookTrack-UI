import { useState } from 'react'
import { CircleCheck, CircleX, ClipboardCheck, Loader2, ScanBarcode, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { issueLabel } from '../utils/endorsement.helpers'
import type { InspScannedBook, WarehouseBook } from '../types/endorsement.types'

interface CompleteInspectionModalProps {
  inspConfirmComplete: boolean
  inspScannedBooks: InspScannedBook[]
  warehouseBooks: WarehouseBook[]
  loadingInspSession: boolean
  onClose: () => void
  onConfirm: () => void
}

export function CompleteInspectionModal({
  inspConfirmComplete,
  inspScannedBooks,
  warehouseBooks,
  loadingInspSession,
  onClose,
  onConfirm,
}: CompleteInspectionModalProps) {
  const [isClosing, setIsClosing] = useState(false)

  if (!inspConfirmComplete) return null

  const processableBooks = inspScannedBooks.filter((b) => b.scan_status === 'processable')
  const prevFlaggedBooks = inspScannedBooks.filter((b) => {
    if (b.scan_status !== 'non_processable') return false
    const wb = warehouseBooks.find(w => w.isbn === b.isbn)
    return wb && wb.scan_status === 'non_processable'
  })
  const newFlaggedBooks = inspScannedBooks.filter((b) => {
    if (b.scan_status !== 'non_processable') return false
    const wb = warehouseBooks.find(w => w.isbn === b.isbn)
    return !wb || wb.scan_status === 'processable'
  })

  const dismiss = () => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 360)
  }

  const theme = {
    border: 'border-blue-200/80',
    header: 'border-blue-100 bg-blue-50',
    surface: 'border-blue-200/80 bg-blue-50',
    detail: 'border-blue-200/70 bg-white/80',
    text: 'text-blue-700',
    hover: 'hover:bg-blue-100/70',
    footer: 'border-blue-100 bg-gradient-to-r from-blue-50/60 via-card to-indigo-50/60',
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px] sm:items-center sm:p-0" style={{ bottom: 0, minHeight: '100%' }} onClick={dismiss}>
      <div data-modal-origin-surface className={cn('my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-slate-950/20 ring-1 ring-black/5 sm:max-h-[90vh]', isClosing ? 'animate-modal-origin-out' : 'animate-modal-origin', theme.border)} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className={cn('flex shrink-0 items-center justify-between border-b px-6 py-4', theme.header)}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg premium-gradient-ui-card--solid">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className={cn('text-[10px] font-bold uppercase tracking-[0.14em]', theme.text)}>Review & Confirm</p>
              <h3 className="mt-0.5 text-base font-black tracking-tight text-foreground">Complete Inspection</h3>
            </div>
          </div>
          <button
            onClick={dismiss}
            className={cn('rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground', theme.hover)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="relative min-w-0 overflow-hidden rounded-2xl border p-3 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-white/68 border-primary/15 ring-primary/10 hover:shadow-primary/20">
              <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full blur-xl bg-primary/20" />
              <div className="relative flex h-full items-center justify-between gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg sm:flex premium-gradient-ui-card--solid">
                  <ScanBarcode className="h-5 w-5" />
                </div>
                <div className="ml-auto min-w-0 text-right">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Total Scanned</p>
                  <p className="mt-0.5 text-3xl font-black leading-none tracking-tight text-primary">{inspScannedBooks.length}</p>
                </div>
              </div>
            </div>
            <div className="relative min-w-0 overflow-hidden rounded-2xl border p-3 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg border-emerald-200/80 bg-emerald-50 ring-emerald-100/70 hover:shadow-emerald-200/60">
              <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full blur-xl bg-emerald-400/20" />
              <div className="relative flex h-full items-center justify-between gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg sm:flex bg-emerald-600 shadow-emerald-500/25">
                  <CircleCheck className="h-5 w-5" />
                </div>
                <div className="ml-auto min-w-0 text-right">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Processable</p>
                  <p className="mt-0.5 text-3xl font-black leading-none tracking-tight text-emerald-700">{processableBooks.length}</p>
                </div>
              </div>
            </div>
            <div className="relative min-w-0 overflow-hidden rounded-2xl border p-3 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg border-rose-200/80 bg-red-50 ring-rose-100/70 hover:shadow-rose-200/60">
              <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full blur-xl bg-red-400/20" />
              <div className="relative flex h-full items-center justify-between gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg sm:flex bg-red-600 shadow-red-500/25">
                  <CircleX className="h-5 w-5" />
                </div>
                <div className="ml-auto min-w-0 text-right">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-red-600">Non-Processable</p>
                  <p className="mt-0.5 text-3xl font-black leading-none tracking-tight text-red-600">{prevFlaggedBooks.length + newFlaggedBooks.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Book Lists */}
          <div className="space-y-4">
            <div className="border border-emerald-200/80 bg-emerald-50/50 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-emerald-200/80 bg-emerald-50 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold tracking-tight text-emerald-900">Processable Books</p>
                  <p className="text-[11px] font-medium text-emerald-700/80 mt-0.5">These books have no issues and are ready for endorsement.</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wide border border-emerald-200/60 shadow-sm">Verified</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-emerald-200/50 custom-scrollbar">
                {processableBooks.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <p className="text-sm font-semibold text-emerald-700/70">No processable books scanned.</p>
                  </div>
                ) : (
                  processableBooks.map((book, idx) => (
                    <div key={`proc-${book.id}-${idx}`} className="flex items-center gap-3 px-5 py-2.5 bg-white/60 hover:bg-white/90 transition-colors">
                      <span className="text-[11px] font-bold font-mono text-emerald-900 w-28 shrink-0">{book.isbn}</span>
                      <span className="text-[11px] font-semibold text-emerald-800 truncate flex-1">{book.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 border border-emerald-200/60 shrink-0">Processable</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-orange-200/80 bg-orange-50/50 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-orange-200/80 bg-orange-50 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold tracking-tight text-orange-900">Previously Flagged Books</p>
                  <p className="text-[11px] font-medium text-orange-700/80 mt-0.5">These books were flagged as non-processable in a previous stage.</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-orange-100 text-orange-700 font-bold uppercase tracking-wide border border-orange-200/60 shadow-sm">Flagged</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-orange-200/50 custom-scrollbar">
                {prevFlaggedBooks.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <p className="text-sm font-semibold text-orange-700/70">No previously flagged books.</p>
                  </div>
                ) : (
                  prevFlaggedBooks.map((book, idx) => (
                    <div key={`prev-${book.id}-${idx}`} className="flex items-center gap-3 px-5 py-2.5 bg-white/60 hover:bg-white/90 transition-colors">
                      <span className="text-[11px] font-bold font-mono text-orange-900 w-28 shrink-0">{book.isbn}</span>
                      <span className="text-[11px] font-semibold text-orange-800 truncate flex-1">{book.title}</span>
                      {book.flag_issue && (
                        <span className="text-[10px] font-medium text-orange-700/80 truncate w-40 shrink-0 hidden sm:block">
                          {issueLabel(book.flag_issue)}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-700 border border-orange-200/60 shrink-0">Previously Flagged</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-rose-200/80 bg-red-50/50 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-rose-200/80 bg-red-50 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold tracking-tight text-rose-900">Newly Flagged Books</p>
                  <p className="text-[11px] font-medium text-rose-700/80 mt-0.5">These books were newly flagged during this inspection session.</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-red-100 text-red-700 font-bold uppercase tracking-wide border border-red-200/60 shadow-sm">Flagged</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-rose-200/50 custom-scrollbar">
                {newFlaggedBooks.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <p className="text-sm font-semibold text-rose-700/70">No newly flagged books.</p>
                  </div>
                ) : (
                  newFlaggedBooks.map((book, idx) => (
                    <div key={`new-${book.id}-${idx}`} className="flex items-center gap-3 px-5 py-2.5 bg-white/60 hover:bg-white/90 transition-colors">
                      <span className="text-[11px] font-bold font-mono text-rose-900 w-28 shrink-0">{book.isbn}</span>
                      <span className="text-[11px] font-semibold text-rose-800 truncate flex-1">{book.title}</span>
                      {book.flag_issue && (
                        <span className="text-[10px] font-medium text-rose-700/80 truncate w-40 shrink-0 hidden sm:block">
                          {issueLabel(book.flag_issue)}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200/60 shrink-0">Newly Flagged</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={cn('flex shrink-0 flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4', theme.footer)}>
          <p className="text-[11px] font-medium text-muted-foreground">
            * Total <span className="font-bold text-foreground">{newFlaggedBooks.length}</span> newly flagged books will be updated in iLMS.
          </p>
          <div className="flex gap-2 sm:shrink-0">
            <button
              onClick={dismiss}
              className="flex-1 rounded-xl border border-border bg-white/80 px-5 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-white hover:text-foreground sm:flex-none"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loadingInspSession}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:flex-none premium-gradient-ui-card--solid hover:shadow-xl"
            >
              {loadingInspSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
              {loadingInspSession ? 'Completing...' : 'Confirm Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
