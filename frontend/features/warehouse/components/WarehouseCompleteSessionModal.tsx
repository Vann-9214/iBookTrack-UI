'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleCheck, Package, AlertTriangle, PackageMinus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import type { MissingIssue, WarehouseSession } from '../types/warehouse.types'

interface WarehouseCompleteSessionModalProps {
  confirmCompleteOpen: boolean
  setConfirmCompleteOpen: (open: boolean) => void
  totalBooksExpected: string
  setTotalBooksExpected: (value: string) => void
  issueIsbn: string
  setIssueIsbn: (value: string) => void
  issueType: 'missing'
  setIssueType: (value: 'missing') => void
  issues: MissingIssue[]
  setIssues: (issues: MissingIssue[]) => void
  fetchingIssueBook: boolean
  handleAddIssue: () => void
  handleRemoveIssue: (isbn: string) => void
  handleIssueKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void
  currentSession: WarehouseSession | null
  loading: boolean
  confirmCloseSession: (skipSimilarLotCheck?: boolean) => void
}

export function WarehouseCompleteSessionModal({
  confirmCompleteOpen,
  setConfirmCompleteOpen,
  totalBooksExpected,
  setTotalBooksExpected,
  issueIsbn,
  setIssueIsbn,
  issueType,
  setIssueType,
  issues,
  setIssues,
  fetchingIssueBook,
  handleAddIssue,
  handleRemoveIssue,
  handleIssueKeyPress,
  currentSession,
  loading,
  confirmCloseSession,
}: WarehouseCompleteSessionModalProps) {
  const { brand } = useBrand()
  const isJaguar = brand === 'jaguar'
  const [isClosing, setIsClosing] = useState(false)
  const expectedInputRef = useRef<HTMLInputElement>(null)
  const theme = isJaguar
    ? {
        border: 'border-emerald-200/80',
        header: 'border-emerald-100 bg-emerald-50',
        surface: 'border-emerald-200/80 bg-emerald-50',
        detail: 'border-emerald-200/70 bg-white/80',
        text: 'text-emerald-700',
        hover: 'hover:bg-emerald-100/70',
        footer: 'border-emerald-100 bg-gradient-to-r from-emerald-50/60 via-card to-emerald-50/60',
        button: 'bg-emerald-600 shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-700',
      }
    : {
        border: 'border-blue-200/80',
        header: 'border-blue-100 bg-blue-50',
        surface: 'border-blue-200/80 bg-blue-50',
        detail: 'border-blue-200/70 bg-white/80',
        text: 'text-blue-700',
        hover: 'hover:bg-blue-100/70',
        footer: 'border-blue-100 bg-gradient-to-r from-blue-50/60 via-card to-indigo-50/60',
        button: 'bg-blue-600 shadow-blue-500/25 hover:from-blue-600 hover:to-indigo-700',
      }

  useEffect(() => {
    if (!confirmCompleteOpen) return
    const timer = window.setTimeout(() => expectedInputRef.current?.focus(), 300)
    return () => window.clearTimeout(timer)
  }, [confirmCompleteOpen])

  const dismiss = () => {
    if (isClosing) return
    setIsClosing(true)
    window.setTimeout(() => {
      setConfirmCompleteOpen(false)
      setTotalBooksExpected('')
      setIssueIsbn('')
      setIssueType('missing')
      setIssues([])
      setIsClosing(false)
    }, 360)
  }

  if (!confirmCompleteOpen) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px] sm:items-center sm:p-0" style={{ bottom: 0, minHeight: '100%' }} onClick={dismiss}>
      <div data-modal-origin-surface className={cn('my-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-slate-950/20 ring-1 ring-black/5 sm:max-h-[90vh]', isClosing ? 'animate-modal-origin-out' : 'animate-modal-origin', theme.border)} onClick={(e) => e.stopPropagation()}>
        <div className={cn('flex shrink-0 items-center justify-between border-b px-6 py-4', theme.header)}>
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg', theme.button)}>
              <CircleCheck className="h-5 w-5" />
            </div>
            <div>
              <p className={cn('text-[10px] font-bold uppercase tracking-[0.14em]', theme.text)}>Session finalization</p>
              <h3 className="mt-0.5 text-base font-black tracking-tight text-foreground">Complete Session</h3>
            </div>
          </div>
          <button
            onClick={dismiss}
            className={cn('rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground', theme.hover)}
            aria-label="Close complete session dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className={cn('space-y-3 border-b px-6 py-5', theme.surface)}>
            <div className="flex items-center gap-2.5">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', theme.detail, theme.text)}>
                <Package className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-foreground tracking-tight">Total Books Expected</label>
                  <span className="text-destructive font-bold text-xs">*</span>
                </div>
                <p className="text-[10px] text-muted-foreground">The actual physical count of books inside this box</p>
              </div>
            </div>
            <input
              ref={expectedInputRef}
              type="number"
              value={totalBooksExpected}
              onChange={(e) => setTotalBooksExpected(e.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !totalBooksExpected.trim()) return
                event.preventDefault()
                confirmCloseSession()
              }}
              placeholder="e.g. 100"
              className={cn('h-11 w-full rounded-xl border bg-white/85 px-3 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2', isJaguar ? 'border-emerald-200/80 focus:ring-emerald-500/20' : 'border-blue-200/80 focus:ring-blue-500/20')}
            />
          </div>
          <div className="space-y-4 border-b border-rose-200/80 bg-red-50 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200/80 bg-white/70 text-rose-700 shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div>
                <label className="text-sm font-bold tracking-tight text-rose-900">Discrepancies</label>
                <p className="text-[11px] font-medium text-rose-700/80">Log any missing books from the physical box</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={issueIsbn}
                  onChange={(e) => setIssueIsbn(e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase())}
                  onKeyPress={handleIssueKeyPress}
                  placeholder="Input missing ISBN..."
                  className="h-11 flex-1 rounded-xl border border-rose-200/80 bg-white/85 px-3 font-mono text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                <button
                  onClick={handleAddIssue}
                  disabled={!issueIsbn.trim() || fetchingIssueBook}
                  aria-label={issueType === 'missing' ? 'Add missing book' : 'Add book'}
                  className="h-11 shrink-0 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:-translate-y-0.5 hover:from-rose-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {fetchingIssueBook ? 'Adding...' : 'Add Book'}
                </button>
              </div>
              {issues.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {issues.length} {issues.length === 1 ? 'issue' : 'issues'} logged
                  </p>
                  <div className="border border-border rounded-lg p-2 bg-background/50">
                    <div
                      className="space-y-1.5 max-h-48 overflow-y-auto pr-1
                        [&::-webkit-scrollbar]:w-1.5
                        [&::-webkit-scrollbar-track]:bg-transparent
                        [&::-webkit-scrollbar-thumb]:bg-rose-500/60
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb:hover]:bg-rose-500/80
                        [&::-webkit-scrollbar-button]:hidden
                        [&::-webkit-scrollbar-button]:h-0
                        [&::-webkit-scrollbar-button]:w-0"
                      style={{ scrollbarColor: 'rgba(244, 63, 94, 0.6) transparent', scrollbarWidth: 'thin' }}
                    >
                      {issues.map((issue, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors shadow-sm bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-red-500/10">
                            <PackageMinus className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="items-center gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">ISBN: {issue.isbn}</span>
                              <p className="text-[13px] font-semibold text-foreground line-clamp-1 leading-tight">{issue.title || 'Unknown Title'}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium shrink-0 bg-red-500/10 text-red-500">
                            Missing
                          </span>
                          <button
                            onClick={() => handleRemoveIssue(issue.isbn)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={cn('flex shrink-0 flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4', theme.footer)}>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div><span className="font-semibold text-foreground">{totalBooksExpected || 0}</span> Expected</div>
            <div className="w-px h-3 bg-border" />
            <div><span className="font-semibold text-foreground">{currentSession?.total_scanned_books || 0}</span> Scanned</div>
            {issues.length > 0 && (
              <>
                <div className="w-px h-3 bg-border" />
                <div><span className="font-semibold text-destructive">{issues.length}</span> Issues</div>
              </>
            )}
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <button onClick={dismiss} className="flex-1 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-white hover:text-foreground sm:flex-none">Cancel</button>
            <button onClick={() => confirmCloseSession()} disabled={loading} className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:flex-none', theme.button)}>
              <CircleCheck className="h-4 w-4" />
              {loading ? 'Completing...' : 'Confirm Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
