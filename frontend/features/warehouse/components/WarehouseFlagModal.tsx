'use client'

import { AlertTriangle, BookOpen, Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { ScannedBook } from '../types/warehouse.types'
import { WAREHOUSE_FLAG_ISSUES } from '../utils/warehouse.helpers'

interface WarehouseFlagModalProps {
  flagModalBook: ScannedBook | null
  setFlagModalBook: (book: ScannedBook | null) => void
  flagIssue: string
  setFlagIssue: (issue: string) => void
  flagRemarks: string
  setFlagRemarks: (remarks: string) => void
  flagSaving: boolean
  flagOpen: boolean
  setFlagOpen: (open: boolean) => void
  saveFlagFromLog: () => void
}

export function WarehouseFlagModal({
  flagModalBook,
  setFlagModalBook,
  flagIssue,
  setFlagIssue,
  flagRemarks,
  setFlagRemarks,
  flagSaving,
  flagOpen,
  setFlagOpen,
  saveFlagFromLog,
}: WarehouseFlagModalProps) {
  if (!flagModalBook) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setFlagModalBook(null)}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Flag as Non-Processable</h3>
              <p className="text-[11px] text-muted-foreground">Mark this book with a rejection reason</p>
            </div>
          </div>
          <button
            onClick={() => setFlagModalBook(null)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-start gap-2">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{flagModalBook.title}</p>
              <p className="text-sm font-bold tracking-wider text-foreground font-mono mt-1">ISBN: {flagModalBook.isbn}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">Rejection Reason <span className="text-destructive">*</span></label>
            <Popover open={flagOpen} onOpenChange={setFlagOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={flagOpen}
                  className="w-full justify-between font-normal text-sm h-9 hover:bg-muted/50 hover:text-foreground"
                >
                  <span className={flagIssue ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
                    {flagIssue ? WAREHOUSE_FLAG_ISSUES.find(i => i.value === flagIssue)?.label : 'Select rejection reason...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput placeholder="Search issue..." />
                  <CommandList className="max-h-48">
                    <CommandEmpty>No issue found.</CommandEmpty>
                    <CommandGroup>
                      {WAREHOUSE_FLAG_ISSUES.map(i => (
                        <CommandItem
                          key={i.value}
                          value={i.label}
                          onSelect={() => { setFlagIssue(i.value); setFlagOpen(false) }}
                          className="flex justify-between items-center w-full"
                        >
                          <span>{i.label}</span>
                          <Check className={cn('h-4 w-4 text-white', flagIssue === i.value ? 'opacity-100' : 'opacity-0')} />
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
              <label className="text-xs font-semibold text-foreground block">Remarks / Page No. <span className="text-destructive">*</span></label>
              <span className={cn('text-[10px] font-medium', flagRemarks.length > 950 ? 'text-destructive' : 'text-muted-foreground')}>
                {flagRemarks.length}/1000
              </span>
            </div>
            <textarea
              value={flagRemarks}
              onChange={(e) => setFlagRemarks(e.target.value)}
              placeholder="e.g. Page 42, bottom margin"
              maxLength={1000}
              className="w-full min-h-[80px] resize-y rounded-md border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
          <button
            onClick={() => setFlagModalBook(null)}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveFlagFromLog}
            disabled={!flagIssue || !flagRemarks.trim() || flagSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium disabled:opacity-50 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {flagSaving ? 'Saving...' : 'Confirm Flag'}
          </button>
        </div>
      </div>
    </div>
  )
}
