import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGE_META } from '../utils/checkpoints.helpers'
import type { Stage } from '../types/checkpoints.types'

interface StageDetailsHeaderProps {
  brand: string
  selectedStage: Stage
  stageBoxesCount: number
  simflexRowsCount: number
  simflexRowsLoading: boolean
  onClose: () => void
}

export function StageDetailsHeader({
  brand,
  selectedStage,
  stageBoxesCount,
  simflexRowsCount,
  simflexRowsLoading,
  onClose,
}: StageDetailsHeaderProps) {
  const meta = STAGE_META[selectedStage]
  const StageIcon = meta.icon

  return (
    <div className="relative overflow-hidden flex items-center justify-between px-6 py-5 bg-gradient-to-r from-primary/10 via-primary/5 to-white">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-20 bg-white/40 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="premium-gradient-ui-card__icon">
          <StageIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="premium-gradient-ui-card__eyebrow">{brand} station</p>
          <h3 className="text-lg font-black tracking-tight text-foreground">{meta.label}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs text-primary/80 font-medium">
              {selectedStage === 'transmit'
                ? `${simflexRowsLoading ? '…' : simflexRowsCount} book${simflexRowsCount === 1 ? '' : 's'} transmitting`
                : `${stageBoxesCount} ${stageBoxesCount === 1 ? 'box' : 'boxes'} waiting`}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-foreground shadow-sm ring-1 ring-black/5 transition hover:scale-105"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
