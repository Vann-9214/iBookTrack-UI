'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MismatchDetailsModalProps {
  book: { isbn: string; title: string; author?: string } | null
  saving: boolean
  onClose: () => void
  onSave: (payload: { ilms_title: string; ilms_author: string; physical_title: string; physical_author: string }) => void
}

export function MismatchDetailsModal({ book, saving, onClose, onSave }: MismatchDetailsModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [physicalTitle, setPhysicalTitle] = useState('')
  const [physicalAuthor, setPhysicalAuthor] = useState('')

  useEffect(() => {
    if (book) {
      setPhysicalTitle('')
      setPhysicalAuthor('')
    }
  }, [book])

  const theme = {
    border: 'border-amber-200/80',
    header: 'border-amber-100 bg-amber-50',
    surface: 'border-amber-200/80 bg-amber-50',
    detail: 'border-amber-200/70 bg-white/80',
    text: 'text-amber-700',
    hover: 'hover:bg-amber-100/70',
    footer: 'border-amber-100 bg-amber-50',
  }

  const close = () => {
    if (isClosing) return
    setIsClosing(true)
    window.setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 360)
  }

  if (!book) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={close}>
      <div data-modal-origin-surface className={cn('w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-slate-950/20 ring-1 ring-black/5', isClosing ? 'animate-modal-origin-out' : 'animate-modal-origin', theme.border)} onClick={(e) => e.stopPropagation()}>
        <div className={cn('flex items-center justify-between border-b px-5 py-4 sm:px-6', theme.header)}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shadow-sm ring-1 ring-amber-200/80">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">Discrepancy</p>
              <h3 className="mt-0.5 text-base font-black tracking-tight text-foreground">Flag as Mismatch</h3>
            </div>
          </div>
          <button onClick={close} className={cn('rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground', theme.hover)} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn('border-b px-5 py-4 sm:px-6', theme.surface)}>
          <div className={cn('flex items-start gap-3 rounded-xl border p-3', theme.detail)}>
            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', theme.surface, theme.text)}>
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title Data from ILMS</p>
              <div className="mt-3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</p>
                  <p className="mt-1 line-clamp-3 text-sm font-semibold leading-5 text-foreground">{book.title}</p>
                </div>
                <div className="border-t border-amber-200/80 pt-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Author</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                    {book.author ? book.author : <span className="italic text-muted-foreground">Unknown Author</span>}
                  </p>
                </div>
                <div className="border-t border-amber-200/80 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ISBN</p>
                  <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-foreground">{book.isbn}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <p className="text-sm text-muted-foreground">Enter the details of the actual physical book you have scanned. This book will remain <strong className="text-foreground">Processable</strong> and continue through the pipeline.</p>
          
          <div>
            <label className="mb-2 block text-xs font-bold text-foreground">Physical Book Title <span className="text-rose-600">*</span></label>
            <input
              type="text"
              value={physicalTitle}
              onChange={(e) => setPhysicalTitle(e.target.value)}
              placeholder="Enter the title on the book..."
              className="h-11 w-full rounded-xl border border-amber-200/80 bg-white/80 px-3 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-foreground">Physical Book Author <span className="text-muted-foreground font-normal">(Optional)</span></label>
            <input
              type="text"
              value={physicalAuthor}
              onChange={(e) => setPhysicalAuthor(e.target.value)}
              placeholder="Enter the author..."
              className="h-11 w-full rounded-xl border border-amber-200/80 bg-white/80 px-3 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
            onClick={() => {
              onSave({
                ilms_title: book.title,
                ilms_author: book.author || '',
                physical_title: physicalTitle,
                physical_author: physicalAuthor,
              })
              close()
            }}
            disabled={!physicalTitle.trim() || saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:-translate-y-0.5 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <AlertTriangle className="h-4 w-4" />
            {saving ? 'Saving...' : 'Confirm Mismatch (Processable)'}
          </button>
        </div>
      </div>
    </div>
  )
}
