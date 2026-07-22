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
    <div
      className={cn(
        'flex items-center justify-between px-6 py-5 border-b border-border/50',
        brand === 'jaguar'
          ? 'bg-gradient-to-r from-green-50/50 to-transparent'
          : 'bg-gradient-to-r from-blue-50/50 to-transparent'
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', meta.color)}>
          <StageIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{meta.label}</h3>
          <p className="text-xs text-muted-foreground">
            {selectedStage === 'transmit'
              ? `${simflexRowsLoading ? '…' : simflexRowsCount} book${simflexRowsCount === 1 ? '' : 's'} transmitting`
              : `${stageBoxesCount} ${stageBoxesCount === 1 ? 'box' : 'boxes'} waiting`}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
