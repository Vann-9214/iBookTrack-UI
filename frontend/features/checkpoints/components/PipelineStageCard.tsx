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
    stage === 'transmit' || stage === 'scan'
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
  const isIdle = status === 'idle'

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
        'group relative overflow-hidden rounded-2xl border-2 p-3.5 flex flex-col cursor-pointer transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 select-none bg-white/68',
        isIdle
          ? 'border-gray-200/80 ring-1 ring-gray-100/70 hover:border-gray-300/80'
          : 'border-primary/20 ring-1 ring-primary/10 hover:border-primary/30',
        className
      )}
    >
      {/* Brand glow for active cards */}
      {!isIdle && (
        <div className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-primary/15 blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
      )}

      {/* Top accent line */}
      <div className={cn('pointer-events-none absolute top-0 left-0 right-0 h-1', isIdle ? 'bg-gray-300' : 'bg-primary')} />

      <div className="relative flex items-center justify-between mb-3 gap-2">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl border shadow-lg shrink-0 text-white',
            isIdle ? 'bg-gray-300 border-gray-300' : 'premium-gradient-ui-card--solid border-transparent'
          )}
        >
          <meta.icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={cn(
              'text-2xl font-black leading-none truncate tracking-tight transition-colors',
              cfg.countColor
            )}
            title={stage === 'transmit' ? `${totalCount} total books` : `${totalCount} total boxes`}
          >
            {activeCount}
          </span>
        </div>
      </div>
      <h3
        className={cn(
          'text-xs font-bold mt-auto truncate',
          isIdle ? 'text-muted-foreground' : 'text-foreground'
        )}
        title={meta.label}
      >
        {meta.label}
      </h3>
      <div className="flex flex-wrap items-center gap-3 mt-1.5 shrink-0 w-full">
        <div className="flex items-center gap-1">
          <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
            {cfg.label}
          </span>
        </div>
        {bottleneckCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wide">
                Delayed
              </span>
            </div>
            <div
              className="flex items-center justify-center bg-orange-100/50 px-1.5 py-0.5 rounded border border-orange-200/50"
              title={`${bottleneckCount} delayed`}
            >
              <span className="text-[10px] font-bold leading-none text-orange-600">
                {bottleneckCount}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
