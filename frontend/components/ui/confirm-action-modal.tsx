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
      <div className={cn(
        "relative rounded-2xl shadow-2xl w-full max-w-[22rem] overflow-hidden",
        isDestructive
          ? 'bg-card'
          : 'bg-gradient-to-br from-slate-50 to-slate-100'
      )}>
        {/* Header */}
        <div className={cn(
          'px-5 pt-5 pb-3',
          isDestructive ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'premium-gradient-ui-card--solid'
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
        <div className="px-6 pt-5 pb-6">
          {/* Description */}
          <p className="text-[15px] text-center leading-relaxed text-foreground/80">
            {description}
          </p>

          {/* Flow arrow (optional) */}
          {flow && (
            <div className="flex items-center justify-center gap-3 my-6 py-2">
              <span className={cn(
                'text-[11px] uppercase tracking-wider font-bold px-4 py-2 rounded-xl shadow-sm ring-1 ring-inset',
                flow.fromColor ?? 'bg-white text-muted-foreground ring-black/10'
              )}>
                {flow.from}
              </span>
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full shadow-sm',
                isDestructive ? 'bg-destructive/10' : 'bg-primary/10'
              )}>
                <ArrowRight className={cn(
                  'h-4 w-4 shrink-0',
                  isDestructive ? 'text-destructive' : 'text-primary'
                )} />
              </div>
              <span className={cn(
                'text-[11px] uppercase tracking-wider font-bold px-4 py-2 rounded-xl shadow-sm ring-1 ring-inset',
                flow.toColor ?? 'bg-white text-primary ring-primary/30'
              )}>
                {flow.to}
              </span>
            </div>
          )}

          {/* Warning / Hint */}
          {hint && (
            <div className={cn(
              "flex items-start gap-3 rounded-xl px-4 py-3.5 mb-6 shadow-sm border",
              isDestructive
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200"
                : "bg-amber-50/50 border-amber-200/50"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5 shrink-0",
                isDestructive ? "text-amber-500" : "text-amber-500"
              )} />
              <p className={cn(
                "text-[13px] font-medium leading-relaxed mt-0.5",
                isDestructive ? "text-amber-800 dark:text-amber-300" : "text-amber-900/80"
              )}>
                {hint}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <button
              onClick={onCancel}
              disabled={loading}
              className={cn(
                "order-2 sm:order-1 w-full px-4 py-3 text-[15px] rounded-xl border transition-colors disabled:opacity-50 font-semibold",
                "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'order-1 sm:order-2 w-full px-4 py-3 text-[15px] rounded-xl font-bold transition-all disabled:opacity-50 shadow-md active:scale-[0.98] text-white',
                isDestructive
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                  : 'premium-gradient-ui-card--solid hover:opacity-90',
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
