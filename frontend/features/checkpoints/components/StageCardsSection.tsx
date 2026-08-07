import { Boxes } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGE_ORDER } from '../utils/checkpoints.helpers'
import { PipelineStageCard } from './PipelineStageCard'
import { PipelineLegend } from './PipelineLegend'
import type { Stage, BoxItem } from '../types/checkpoints.types'

interface StageCardsSectionProps {
  brand: string
  boxesByStage: Record<Stage, BoxItem[]>
  scanBooks: number | null
  transmitBooks: number | null
  topLoading: boolean
  onSelectStage: (stage: Stage) => void
}

export function StageCardsSection({
  brand,
  boxesByStage,
  scanBooks,
  transmitBooks,
  topLoading,
  onSelectStage,
}: StageCardsSectionProps) {
  return (
    <div className="premium-gradient-ui-card premium-gradient-ui-card--static relative overflow-hidden">
      <div className="premium-gradient-ui-card__glow" />

      <div className="relative p-4 sm:p-5"> 
        <div className="flex items-center gap-3 mb-5">
          <div className="premium-gradient-ui-card__icon">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="premium-gradient-ui-card__eyebrow">Pipeline overview</p>
            <h2 className="premium-gradient-ui-card__title">Station Stages</h2>
          </div>
        </div>

        <div className="hidden lg:flex items-stretch gap-3">
          {STAGE_ORDER.map((stage) => (
            <PipelineStageCard
              key={stage}
              stage={stage}
              boxes={boxesByStage[stage] || []}
              transmitBooks={transmitBooks}
              brand={brand}
              onClick={onSelectStage}
              className="flex-1 min-w-0"
              loading={topLoading}
            />
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3 lg:hidden mt-4">
          {STAGE_ORDER.map((stage) => (
            <PipelineStageCard
              key={stage}
              stage={stage}
              boxes={boxesByStage[stage] || []}
              transmitBooks={transmitBooks}
              brand={brand}
              onClick={onSelectStage}
              className="hover:scale-[1.01] w-[calc(50%-0.375rem)]"
              loading={topLoading}
            />
          ))}
        </div>

        <PipelineLegend brand={brand} />
      </div>
    </div>
  )
}
