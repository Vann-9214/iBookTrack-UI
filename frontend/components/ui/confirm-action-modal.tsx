'use client'

import { ArrowRight, AlertTriangle, CheckCircle2, Send, Inbox } from 'lucide-react'
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

  const icon =
    variant === 'destructive' ? (
      <Send className="h-5 w-5 text-white" />
    ) : title.toLowerCase().includes('receive') ? (
      <Inbox className="h-5 w-5 text-white" />
    ) : (
      <CheckCircle2 className="h-5 w-5 text-white" />
    )

  const isDestructive = variant === 'destructive'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[22rem] overflow-hidden">
        {/* Colored header */}
        <div className={cn(
          'px-5 pt-4 pb-3',
          isDestructive ? 'bg-destructive' : 'bg-primary',
        )}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 shrink-0">
              {icon}
            </div>
            <h3 className="text-base font-semibold text-white leading-tight">
              {title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pt-3 pb-5">
          {/* Description */}
          <p className="text-sm text-center text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Flow arrow (optional) */}
          {flow && (
            <div className="flex items-center justify-center gap-2 my-4">
              <span className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-full border shadow-sm',
                flow.fromColor ?? 'bg-muted text-muted-foreground border-border',
              )}>
                {flow.from}
              </span>
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full',
                variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10',
              )}>
                <ArrowRight className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  variant === 'destructive' ? 'text-destructive' : 'text-primary',
                )} />
              </div>
              <span className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-full border shadow-sm',
                flow.toColor ?? 'bg-primary/10 text-primary border-primary/30',
              )}>
                {flow.to}
              </span>
            </div>
          )}

          {/* Warning / Hint */}
          {hint && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2.5 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {hint}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <button
              onClick={onCancel}
              disabled={loading}
              className="order-2 sm:order-1 w-full px-4 py-2.5 text-sm rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'order-1 sm:order-2 w-full px-4 py-2.5 text-sm rounded-xl font-medium transition-colors disabled:opacity-50',
                variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
              )}
            >
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
