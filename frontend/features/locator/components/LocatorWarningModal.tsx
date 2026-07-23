import React from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LocatorWarningModalProps {
  warningModal: string | null
  setWarningModal: (val: string | null) => void
}

export const LocatorWarningModal: React.FC<LocatorWarningModalProps> = ({
  warningModal,
  setWarningModal
}) => {
  if (!warningModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setWarningModal(null)}>
      <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Cannot Remove</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{warningModal}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setWarningModal(null)}>Got it</Button>
        </div>
      </div>
    </div>
  )
}
