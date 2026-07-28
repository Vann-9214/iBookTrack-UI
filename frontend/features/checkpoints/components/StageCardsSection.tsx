import { Card } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/page-loader'
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
    <Card className="bg-card border border-border rounded-2xl p-5 shadow-sm relative">
      {topLoading && <PageLoader />}

      <div className="hidden lg:flex items-stretch gap-3">
        {STAGE_ORDER.map((stage) => (
          <PipelineStageCard
            key={stage}
            stage={stage}
            boxes={boxesByStage[stage]}
            transmitBooks={transmitBooks}
            brand={brand}
            onClick={onSelectStage}
            className="flex-1 min-w-0"
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3 lg:hidden">
        {STAGE_ORDER.map((stage) => (
          <PipelineStageCard
            key={stage}
            stage={stage}
            boxes={boxesByStage[stage]}
            transmitBooks={transmitBooks}
            brand={brand}
            onClick={onSelectStage}
            className="hover:scale-[1.01] w-[calc(50%-0.375rem)]"
          />
        ))}
      </div>

      <PipelineLegend brand={brand} />
    </Card>
  )
}
