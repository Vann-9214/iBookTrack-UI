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

  const M = brand === 'jaguar'
    ? {
        headerBg: 'bg-gradient-to-r from-emerald-50 to-green-50',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
        dot: 'bg-emerald-500',
      }
    : {
        headerBg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        dot: 'bg-blue-500',
      }

  return (
    <div className={cn('flex items-center justify-between px-6 py-5', M.headerBg)}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg', M.iconBg)}>
          <StageIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight text-gray-800">{meta.label}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('h-2 w-2 rounded-full', M.dot)} />
            <span className="text-xs text-gray-500">
              {selectedStage === 'transmit'
                ? `${simflexRowsLoading ? '…' : simflexRowsCount} book${simflexRowsCount === 1 ? '' : 's'} transmitting`
                : `${stageBoxesCount} ${stageBoxesCount === 1 ? 'box' : 'boxes'} waiting`}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white text-gray-500 hover:text-gray-800 transition-all"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
