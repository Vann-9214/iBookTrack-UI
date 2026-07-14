'use client'

import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmActionVariant = 'default' | 'destructive'

export interface ConfirmActionModalProps {
  open: boolean
  title: string
  /** Primary description line (can include JSX for bold spans) */
  description: React.ReactNode
  /** Optional secondary hint below the description */
  hint?: string
  /** Optional source → destination flow indicator */
  flow?: {
    from: string
    to: string
    fromColor?: string
    toColor?: string
  }
  confirmLabel: string
  variant?: ConfirmActionVariant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmActionModal({
  open,
  title,
  description,
  hint,
  flow,
  confirmLabel,
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4">
        {/* Title */}
        <h3 className="text-base font-semibold text-foreground mb-3">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-2">{description}</p>

        {/* Flow arrow (optional) */}
        {flow && (
          <div className="flex items-center gap-2 my-3">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              flow.fromColor ?? 'bg-muted text-muted-foreground border-border',
            )}>
              {flow.from}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              flow.toColor ?? 'bg-primary/10 text-primary border-primary/30',
            )}>
              {flow.to}
            </span>
          </div>
        )}

        {/* Hint */}
        {hint && (
          <p className="text-xs text-muted-foreground mt-2 mb-1">{hint}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50',
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
