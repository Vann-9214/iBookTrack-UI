import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGE_ORDER, STAGE_META } from '../utils/checkpoints.helpers'
import type { Stage, BoxItem } from '../types/checkpoints.types'

interface PipelineStageFlowProps {
  boxesByStage: Record<Stage, BoxItem[]>
  scanBooks: number | null
  transmitBooks: number | null
}

export function PipelineStageFlow({
  boxesByStage,
  scanBooks,
  transmitBooks,
}: PipelineStageFlowProps) {
  return (
    <div className="relative mt-2 mb-8">
      {/* Continuous connecting line */}
      <div className="hidden lg:block absolute top-[20px] left-[7%] right-[7%] h-[3px] bg-border/40 rounded-full z-0" />

      {/* Desktop perfectly aligned headers */}
      <div className="hidden lg:grid grid-cols-7 gap-3 relative z-10">
        {STAGE_ORDER.map((stage) => {
          const meta = STAGE_META[stage]
          const count =
            stage === 'transmit'
              ? transmitBooks ?? 0
              : boxesByStage[stage]?.length || 0
          const bgClass = meta.color.match(/bg-\w+-100/)?.[0] || 'bg-gray-100'
          const solidBgClass = meta.solidBg
          const textClass = meta.color.match(/text-\w+-700/)?.[0] || 'text-gray-700'
          const borderClass = meta.color.match(/border-\w+-300/)?.[0] || 'border-gray-300'

          return (
            <div key={stage} className="flex flex-col items-center justify-center gap-2 group cursor-default">
              {/* Node Circle */}
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center border-2 bg-background transition-transform duration-300 group-hover:scale-110 shadow-sm relative',
                  borderClass,
                  textClass
                )}
              >
                <meta.icon className="h-4 w-4" />
                {count > 0 && (
                  <div
                    className={cn(
                      'absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-background shadow-sm',
                      solidBgClass
                    )}
                  >
                    {count}
                  </div>
                )}
              </div>

              {/* Label below node */}
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
                {meta.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile wrapping headers */}
      <div className="flex lg:hidden flex-col gap-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {STAGE_ORDER.map((stage, i) => {
            const meta = STAGE_META[stage]
            const count =
              stage === 'transmit'
                ? transmitBooks ?? 0
                : boxesByStage[stage]?.length || 0
            const textClass = meta.color.match(/text-\w+-700/)?.[0] || 'text-gray-700'
            const borderClass = meta.color.match(/border-\w+-300/)?.[0] || 'border-gray-300'

            return (
              <div key={stage} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 bg-background shadow-sm',
                    borderClass,
                    textClass
                  )}
                >
                  <meta.icon className="h-3.5 w-3.5" />
                  {meta.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'ml-1 px-1.5 py-0.5 rounded-full text-[10px] text-white',
                        meta.solidBg
                      )}
                    >
                      {count}
                    </span>
                  )}
                </div>
                {i < STAGE_ORDER.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
