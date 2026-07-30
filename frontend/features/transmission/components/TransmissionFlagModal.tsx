'use client'

import { BookOpen, Check, ChevronsUpDown, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FLAG_ISSUES } from '@/constants/flag-issues'
import type { LotIsbn } from '../types/transmission.types'

interface TransmissionFlagModalProps {
  flagModalScan: LotIsbn
  setFlagModalScan: (scan: LotIsbn | null) => void
  flagIssue: string
  setFlagIssue: (issue: string) => void
  flagRemarks: string
  setFlagRemarks: (remarks: string) => void
  flagging: boolean
  flagError: string | null
  flagOpen: boolean
  setFlagOpen: (open: boolean) => void
  handleFlagSubmit: () => Promise<void>
}

export function TransmissionFlagModal({
  flagModalScan,
  setFlagModalScan,
  flagIssue,
  setFlagIssue,
  flagRemarks,
  setFlagRemarks,
  flagging,
  flagError,
  flagOpen,
  setFlagOpen,
  handleFlagSubmit,
}: TransmissionFlagModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setFlagModalScan(null)}
    >
      <div
        className="bg-card border border-border shadow-2xl w-full max-w-md mx-4 rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Flag as Non-Processable</h3>
              <p className="text-[11px] text-muted-foreground">Mark this book with a rejection reason</p>
            </div>
          </div>
          <button
            onClick={() => setFlagModalScan(null)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-start gap-2">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{flagModalScan.title}</p>
              <p className="text-sm font-bold tracking-wider text-foreground font-mono mt-1">
                ISBN: {flagModalScan.isbn}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Rejection Reason <span className="text-destructive">*</span>
            </label>
            <Popover open={flagOpen} onOpenChange={setFlagOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={flagOpen}
                  className="w-full justify-between font-normal text-sm h-9 hover:bg-muted/50 hover:text-foreground"
                >
                  <span
                    className={
                      flagIssue ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    }
                  >
                    {flagIssue ? FLAG_ISSUES.find((i) => i.value === flagIssue)?.label : 'Select rejection reason...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-full p-0"
                align="start"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
              >
                <Command>
                  <CommandInput placeholder="Search issue..." />
                  <CommandList className="max-h-48">
                    <CommandEmpty>No issue found.</CommandEmpty>
                    <CommandGroup>
                      {FLAG_ISSUES.filter(i => i.value !== 'missing-from-warehouse' && i.value !== 'missing-from-inventory').map((i) => (
                        <CommandItem
                          key={i.value}
                          value={i.label}
                          onSelect={() => {
                            setFlagIssue(i.value)
                            setFlagOpen(false)
                          }}
                          className="flex justify-between items-center w-full"
                        >
                          <span>{i.label}</span>
                          <Check
                            className={cn('h-4 w-4 text-white', flagIssue === i.value ? 'opacity-100' : 'opacity-0')}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Remarks / Page No. <span className="text-destructive">*</span></label>
            <textarea
              value={flagRemarks}
              onChange={(e) => setFlagRemarks(e.target.value)}
              placeholder="e.g. Page 42, bottom margin"
              rows={2}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {flagError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{flagError}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setFlagModalScan(null)} disabled={flagging}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleFlagSubmit}
            disabled={flagging || !flagIssue || !flagRemarks.trim()}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {flagging ? 'Saving...' : 'Confirm Flag'}
          </Button>
        </div>
      </div>
    </div>
  )
}
