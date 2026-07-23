import { cn } from '@/lib/utils'
import { getStepStatus, getStatusConfig, getRelevantTimeForBox, STAGE_META } from '../utils/checkpoints.helpers'
import type { Stage, BoxItem } from '../types/checkpoints.types'

interface PipelineStageCardProps {
  stage: Stage
  boxes: BoxItem[]
  transmitBooks: number | null
  brand: string
  onClick: (stage: Stage) => void
  className?: string
}

export function PipelineStageCard({
  stage,
  boxes,
  transmitBooks,
  brand,
  onClick,
  className,
}: PipelineStageCardProps) {
  const meta = STAGE_META[stage]

  const bottleneckCount =
    stage === 'transmit'
      ? 0
      : boxes.filter((b) => {
          const relevantTime = getRelevantTimeForBox(b, stage)
          if (!relevantTime) return false
          const diffDays =
            (Date.now() - new Date(relevantTime).getTime()) /
            (1000 * 60 * 60 * 24)
          return diffDays >= 1
        }).length

  const totalCount = stage === 'transmit' ? transmitBooks ?? 0 : boxes.length
  const activeCount =
    stage === 'transmit' ? totalCount : Math.max(0, totalCount - bottleneckCount)

  const status = getStepStatus(totalCount)
  const cfg = getStatusConfig(status, brand)

  return (
    <div
      key={stage}
      role="button"
      tabIndex={0}
      onClick={() => onClick(stage)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick(stage)
      }}
      className={cn(
        'rounded-xl border border-border bg-card shadow-xs p-3.5 flex flex-col cursor-pointer transition-all duration-200 hover:shadow-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/30 select-none relative overflow-hidden',
        className
      )}
    >
      <div className={cn('absolute top-0 left-0 right-0 h-1', cfg.borderGradient)} />
      <div className="flex items-center justify-between mb-3 gap-2">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border shrink-0',
            cfg.iconColorCls
          )}
        >
          <meta.icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={cn(
              'text-2xl font-black leading-none truncate tracking-tight',
              cfg.countColor
            )}
            title={stage === 'transmit' ? `${totalCount} total books` : `${totalCount} total boxes`}
          >
            {activeCount}
          </span>
          {bottleneckCount > 0 && (
            <div
              className="flex items-center gap-1 bg-orange-100/50 px-1.5 py-0.5 rounded border border-orange-200/50"
              title={`${bottleneckCount} boxes delayed > 1 day`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-bold leading-none text-orange-600">
                {bottleneckCount} delayed
              </span>
            </div>
          )}
        </div>
      </div>
      <h3
        className="text-xs font-bold text-card-foreground mt-auto truncate"
        title={meta.label}
      >
        {meta.label}
      </h3>
      <div className="flex flex-wrap items-center gap-3 mt-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
            {cfg.label}
          </span>
        </div>
        {bottleneckCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wide">
              Delayed
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
