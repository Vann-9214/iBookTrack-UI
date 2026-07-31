'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { PipelineStageSummary, StageFilter } from '../types/transmission.types'
import { formatPipelineStage } from '../utils/transmission.helpers'

import { useBrand } from '@/hooks/use-brand'

interface TransmissionStageBreakdownProps {
  stages: PipelineStageSummary[]
  stageFilter: StageFilter | null
  setStageFilter: (filter: StageFilter | null) => void
}

export function TransmissionStageBreakdown({
  stages,
  stageFilter,
  setStageFilter,
}: TransmissionStageBreakdownProps) {
  const { brand } = useBrand()
  const STAGE_ORDER = ['Scanning', 'Jaguar Validate', 'Tif2PDF', 'Preval', 'Transmission_Archive']
  const stageMap = Object.fromEntries(stages.map((s) => [s.Stage, s])) as Record<string, PipelineStageSummary>

  // Map only the 5 explicit stages in STAGE_ORDER
  const ordered = STAGE_ORDER.map(
    (n) =>
      stageMap[n] || {
        Stage: n,
        Total: 0,
        Completed: 0,
        Ongoing: 0,
        Failed: 0,
      }
  )

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ordered.map((s) => {
        const pct = s.Total > 0 ? (s.Completed / s.Total) * 100 : 0
        return (
          <div
            key={s.Stage}
            onClick={() =>
              setStageFilter(
                stageFilter?.stage === s.Stage && stageFilter?.category === 'ALL'
                  ? null
                  : { stage: s.Stage, category: 'ALL' }
              )
            }
            className={cn(
              'cursor-pointer rounded-2xl border bg-white shadow-sm p-2 sm:p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex flex-col gap-1.5 sm:gap-3 relative overflow-hidden text-left',
              s.Stage === 'Transmission_Archive' && 'col-span-2 justify-self-center w-full max-w-[calc(50%-0.375rem)] sm:max-w-none sm:col-span-1',
              stageFilter?.stage === s.Stage && stageFilter?.category === 'ALL'
                ? brand === 'jaguar'
                  ? 'border-green-600 ring-2 ring-green-600/20'
                  : 'border-indigo-400 ring-2 ring-indigo-400/20'
                : 'border-gray-200'
            )}
          >

            <div className="flex items-start justify-between gap-1">
              <p className="text-[9px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wide leading-tight break-words">
                {formatPipelineStage(s.Stage)}
              </p>
              <span className="text-base sm:text-xl font-black text-gray-800 leading-none shrink-0">
                {s.Total.toLocaleString()}
              </span>
            </div>

            <Progress value={pct} className="h-1.5" />

            <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
              {[
                {
                  key: 'COMPLETED',
                  label: 'DONE',
                  smLabel: 'COMPLETED',
                  count: s.Completed,
                  bg: 'bg-green-50',
                  border: 'border-green-100',
                  hover: 'hover:bg-green-100',
                  ring: 'ring-green-400',
                  text: 'text-green-500',
                  num: 'text-green-700',
                },
                {
                  key: 'ONGOING',
                  label: 'LIVE',
                  smLabel: 'ONGOING',
                  count: s.Ongoing,
                  bg: 'bg-blue-50',
                  border: 'border-blue-100',
                  hover: 'hover:bg-blue-100',
                  ring: 'ring-blue-400',
                  text: 'text-blue-400',
                  num: 'text-blue-600',
                },
                {
                  key: 'FAILED',
                  label: 'FAIL',
                  smLabel: 'FAILED',
                  count: s.Failed,
                  bg: 'bg-red-50',
                  border: 'border-red-100',
                  hover: 'hover:bg-red-100',
                  ring: 'ring-red-400',
                  text: 'text-red-400',
                  num: 'text-red-600',
                },
              ].map((p) => {
                const isActive = stageFilter?.stage === s.Stage && stageFilter?.category === p.key
                return (
                  <button
                    key={p.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      setStageFilter(isActive ? null : { stage: s.Stage, category: p.key as StageFilter['category'] })
                    }}
                    className={cn(
                      'flex flex-col items-center rounded-lg border px-0.5 py-1 sm:px-1.5 sm:py-1.5 transition-colors focus:outline-none',
                      p.bg,
                      p.border,
                      p.hover,
                      isActive && `ring-2 ${p.ring} bg-opacity-100`
                    )}
                  >
                    <span
                      className={cn(
                        'font-semibold uppercase tracking-wide leading-none mb-0.5 text-[7px] sm:text-[10px]',
                        p.text
                      )}
                    >
                      <span className="sm:hidden">{p.label}</span>
                      <span className="hidden sm:inline">{p.smLabel}</span>
                    </span>
                    <span className={cn('font-black leading-none text-[11px] sm:text-sm', p.num)}>{p.count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
