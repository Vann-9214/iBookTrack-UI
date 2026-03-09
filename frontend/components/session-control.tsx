import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

interface SessionControlProps {
  activeLot: string
  sessionActive: boolean
  onNewSession: () => void
  onCloseSession: () => void
}

export function SessionControl({
  activeLot,
  sessionActive,
  onNewSession,
  onCloseSession,
}: SessionControlProps) {
  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-lg p-6">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Active Lot</p>
        <p className="text-2xl font-bold text-foreground">{activeLot}</p>
      </div>
      <div className="flex gap-3">
        {!sessionActive ? (
          <Button
            onClick={onNewSession}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Excel Entry
          </Button>
        ) : (
          <Button
            onClick={onCloseSession}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Close Session / Finish
          </Button>
        )}
      </div>
    </div>
  )
}
