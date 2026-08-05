'use client'

import { useState } from 'react'
import { AlertTriangle, BookOpen, Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { FLAG_ISSUES } from '@/constants/flag-issues'
import type { VerificationScannedBook } from '../types/inventory.types'

export function InventoryScanModal({
  book,
  issue,
  remarks,
  saving,
  onIssueChange,
  onRemarksChange,
  onClose,
  onSave,
}: {
  book: VerificationScannedBook | null
  issue: string
  remarks: string
  saving: boolean
  onIssueChange: (value: string) => void
  onRemarksChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [flagOpen, setFlagOpen] = useState(false)

  const theme = {
    border: 'border-rose-200/80',
    header: 'border-rose-100 bg-red-50',
    surface: 'border-rose-200/80 bg-red-50',
    detail: 'border-rose-200/70 bg-white/80',
    text: 'text-rose-700',
    hover: 'hover:bg-rose-100/70',
    footer: 'border-rose-100 bg-red-50',
  }

  const close = () => {
    if (isClosing) return
    setIsClosing(true)
    window.setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 360)
  }

  const filteredIssues = FLAG_ISSUES.filter(i => 
    i.value !== 'missing-from-inventory' && 
    i.value !== 'missing-from-endorsement' &&
    i.value !== 'mismatched-book' &&
    i.value !== 'extra-book'
  )

  if (!book) return null
  const isEditing = book.scan_status === 'non_processable'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={close}>
      <div data-modal-origin-surface className={cn('w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-slate-950/20 ring-1 ring-black/5', isClosing ? 'animate-modal-origin-out' : 'animate-modal-origin', theme.border)} onClick={(e) => e.stopPropagation()}>
        <div className={cn('flex items-center justify-between border-b px-5 py-4 sm:px-6', theme.header)}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 shadow-sm ring-1 ring-rose-200/80">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600">Rejection review</p>
              <h3 className="mt-0.5 text-base font-black tracking-tight text-foreground">{isEditing ? 'Edit Flag' : 'Flag as Non-Processable'}</h3>
            </div>
          </div>
          <button onClick={close} className={cn('rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground', theme.hover)} aria-label="Close flag dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn('border-b px-5 py-4 sm:px-6', theme.surface)}>
          <div className={cn('flex items-start gap-3 rounded-xl border p-3', theme.detail)}>
            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', theme.surface, theme.text)}>
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected book</p>
              <div className="mt-3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</p>
                  <p className="mt-1 line-clamp-3 text-sm font-semibold leading-5 text-foreground">{book.title}</p>
                </div>
                <div className="border-t border-rose-200/80 pt-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Author</p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-foreground">{book.author || '—'}</p>
                </div>
                <div className="border-t border-rose-200/80 pt-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ISBN</p>
                  <p className={cn('mt-1 font-mono text-xs font-bold tracking-wide', theme.text)}>{book.isbn}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div>
            <label className="mb-2 block text-xs font-bold text-foreground">Rejection Reason <span className="text-rose-600">*</span></label>
            <Popover open={flagOpen} onOpenChange={setFlagOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={flagOpen}
                  className="h-11 w-full justify-between rounded-xl border border-rose-200/80 bg-white/80 px-3 text-sm font-medium shadow-sm transition-colors hover:bg-rose-50/70 hover:text-foreground"
                >
                  <span className={issue ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
                    {issue ? filteredIssues.find(i => i.value === issue)?.label : 'Select rejection reason...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput placeholder="Search issue..." />
                  <CommandList className="max-h-48">
                    <CommandEmpty>No issue found.</CommandEmpty>
                    <CommandGroup heading="General rejection reasons">
                      {filteredIssues.map(i => (
                        <CommandItem
                          key={i.value}
                          value={i.label}
                          onSelect={() => { onIssueChange(i.value); setFlagOpen(false) }}
                          className="flex w-full items-center justify-between"
                        >
                          <span>{i.label}</span>
                          <Check className={cn('h-4 w-4 text-primary', issue === i.value ? 'opacity-100' : 'opacity-0')} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-foreground">Remarks / Page No. <span className="text-rose-600">*</span></label>
              <span className={cn('text-[10px] font-medium', remarks.length > 950 ? 'text-destructive' : 'text-muted-foreground')}>
                {remarks.length}/1000
              </span>
            </div>
            <textarea
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              placeholder="e.g. Page 42, bottom margin"
              maxLength={1000}
              className="min-h-[96px] w-full resize-y rounded-xl border border-rose-200/80 bg-white/80 p-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        </div>

        <div className={cn('flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6', theme.footer)}>
          <button
            onClick={close}
            className="rounded-xl border border-border bg-white/80 px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-white hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(); close(); }}
            disabled={!issue || !remarks.trim() || saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:-translate-y-0.5 hover:from-rose-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <AlertTriangle className="h-4 w-4" />
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Confirm Flag'}
          </button>
        </div>
      </div>
    </div>
  )
}
