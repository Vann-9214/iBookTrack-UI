'use client'

import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useState } from 'react'

export function AlertBox() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-semibold text-foreground text-sm">
          BATCH-003 needs attention
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Chennai Depot batch has 15 books with quality issues. Manual review required before proceeding.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
