import { AlertTriangle, X } from 'lucide-react'
import { FLAG_ISSUES } from '@/constants/flag-issues'
import type { InspScannedBook } from '../types/endorsement.types'

interface InspectionFlagModalProps {
  inspFlagModalBook: InspScannedBook | null
  inspFlagIssue: string
  setInspFlagIssue: (issue: string) => void
  inspFlagRemarks: string
  setInspFlagRemarks: (remarks: string) => void
  inspFlagSaving: boolean
  onClose: () => void
  onSave: () => void
}

export function InspectionFlagModal({
  inspFlagModalBook,
  inspFlagIssue,
  setInspFlagIssue,
  inspFlagRemarks,
  setInspFlagRemarks,
  inspFlagSaving,
  onClose,
  onSave,
}: InspectionFlagModalProps) {
  if (!inspFlagModalBook) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="premium-gradient-ui-card__glow" />
        <div className="relative flex items-start justify-between mb-4">
          <div className="flex gap-3">
            <div className="premium-gradient-ui-card__icon w-10 h-10">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground">Flag as Non-Processable</h3>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{inspFlagModalBook.isbn}</span> — {inspFlagModalBook.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:bg-muted p-1.5 rounded-md transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Issue <span className="text-destructive">*</span>
            </label>
            <select
              value={inspFlagIssue}
              onChange={(e) => setInspFlagIssue(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select issue…</option>
              {FLAG_ISSUES.map((i: { value: string; label: string }) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Remarks / Page No. <span className="text-destructive">*</span>
            </label>
            <textarea
              value={inspFlagRemarks}
              onChange={(e) => setInspFlagRemarks(e.target.value)}
              placeholder="e.g. Page 42, bottom margin"
              className="w-full min-h-[80px] resize-y rounded-md border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!inspFlagIssue || !inspFlagRemarks.trim() || inspFlagSaving}
            className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium disabled:opacity-50 transition-colors"
          >
            {inspFlagSaving ? 'Saving…' : 'Confirm Flag'}
          </button>
        </div>
      </div>
    </div>
  )
}
