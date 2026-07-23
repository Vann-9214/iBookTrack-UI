'use client'

import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { BoxGroup, LotIsbnFilter, LotSummary } from '../types/transmission.types'
import { LotBoxFilter } from './LotBoxFilter'

interface LotTransmissionSummaryProps {
  lotSummary: LotSummary
  lotIsbnFilter: LotIsbnFilter
  setLotIsbnFilter: (filter: LotIsbnFilter) => void
  lotBoxFilter: string
  setLotBoxFilter: (value: string) => void
  lotBoxSelectorOpen: boolean
  setLotBoxSelectorOpen: (open: boolean) => void
  lotBoxSearch: string
  setLotBoxSearch: (value: string) => void
  lotBoxGroups: BoxGroup[]
  matchedBoxGroups: BoxGroup[]
  visibleBoxGroups: BoxGroup[]
  activeBoxGroup: BoxGroup | null | undefined
  BOX_RENDER_CAP: number
  lotIsbns: { isbn: string }[]
  setShowLotPicker: (show: boolean) => void
}

export function LotTransmissionSummary({
  lotSummary,
  lotIsbnFilter,
  setLotIsbnFilter,
  lotBoxFilter,
  setLotBoxFilter,
  lotBoxSelectorOpen,
  setLotBoxSelectorOpen,
  lotBoxSearch,
  setLotBoxSearch,
  lotBoxGroups,
  matchedBoxGroups,
  visibleBoxGroups,
  activeBoxGroup,
  BOX_RENDER_CAP,
  lotIsbns,
  setShowLotPicker,
}: LotTransmissionSummaryProps) {
  const wipCount = (lotSummary.processable || 0) - (lotSummary.transmitted || 0)

  const stats = useMemo(
    () => [
      {
        key: 'all',
        label: 'Total',
        value: lotSummary.total,
        activeBorder: 'border-gray-400',
        activeBg: 'bg-gray-100',
        baseBorder: 'border-gray-200',
        baseBg: 'bg-gray-50/80',
        hover: 'hover:bg-gray-100',
        text: 'text-gray-400',
        num: 'text-gray-700',
      },
      {
        key: 'processable',
        label: 'Processable',
        value: lotSummary.processable,
        activeBorder: 'border-blue-400',
        activeBg: 'bg-blue-100',
        baseBorder: 'border-blue-200',
        baseBg: 'bg-blue-50/80',
        hover: 'hover:bg-blue-100',
        text: 'text-blue-400',
        num: 'text-blue-600',
      },
      {
        key: 'non_processable',
        label: 'Non-Processable',
        value: lotSummary.non_processable,
        activeBorder: 'border-red-400',
        activeBg: 'bg-red-100',
        baseBorder: 'border-red-200',
        baseBg: 'bg-red-50/80',
        hover: 'hover:bg-red-100',
        text: 'text-red-400',
        num: 'text-red-600',
      },
      {
        key: 'transmitted',
        label: 'Transmitted',
        value: lotSummary.transmitted,
        activeBorder: 'border-emerald-400',
        activeBg: 'bg-emerald-100',
        baseBorder: 'border-emerald-200',
        baseBg: 'bg-emerald-50/80',
        hover: 'hover:bg-emerald-100',
        text: 'text-emerald-400',
        num: 'text-emerald-600',
      },
      {
        key: 'wip',
        label: 'WIP',
        value: wipCount,
        activeBorder: 'border-amber-400',
        activeBg: 'bg-amber-100',
        baseBorder: 'border-amber-200',
        baseBg: 'bg-amber-50/80',
        hover: 'hover:bg-amber-100',
        text: 'text-amber-400',
        num: 'text-amber-600',
      },
    ],
    [lotSummary.total, lotSummary.processable, lotSummary.non_processable, lotSummary.transmitted, wipCount]
  )

  return (
    <div className="flex flex-col gap-3">
      <Card className="border-border bg-card py-0 gap-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-gradient-to-r from-indigo-50/80 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <p className="text-sm font-bold text-gray-800 tracking-tight">{lotSummary.lot_number}</p>
            <Badge variant="outline" className="text-[10px] border-indigo-200 bg-indigo-50 text-indigo-600 font-semibold">
              {lotSummary.total} {lotSummary.total === 1 ? 'book' : 'books'}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {lotSummary.processable > 0 && (
              <p className="text-xs text-muted-foreground">
                {((lotSummary.transmitted / lotSummary.processable) * 100).toFixed(0)}% transmitted
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 gap-1 text-muted-foreground"
              onClick={() => setShowLotPicker(true)}
            >
              <ChevronDown className="h-3 w-3" />
              Change LOT
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {stats.map((s) => (
              <div
                key={s.key}
                className={cn(
                  'rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                  lotIsbnFilter === s.key
                    ? `${s.activeBorder} ${s.activeBg} shadow-sm`
                    : `${s.baseBorder} ${s.baseBg} ${s.hover}`
                )}
                onClick={() => setLotIsbnFilter(s.key as LotIsbnFilter)}
              >
                <p className={cn('text-[10px] font-medium uppercase tracking-wider', s.text)}>{s.label}</p>
                <p className={cn('text-xl font-black leading-tight mt-0.5', s.num)}>{s.value}</p>
              </div>
            ))}
          </div>

          {lotSummary.processable > 0 && (
            <div className="px-1">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-gray-500">Transmission Progress</p>
                <p className="text-[11px] font-medium text-muted-foreground">
                  <span className="text-emerald-600 font-bold">{lotSummary.transmitted}</span>
                  <span className="text-gray-400"> / </span>
                  <span>{lotSummary.processable}</span>
                </p>
              </div>
              <Progress value={(lotSummary.transmitted / lotSummary.processable) * 100} className="h-2" />
            </div>
          )}

          {lotSummary.wip &&
            lotSummary.wip.done_scan +
              lotSummary.wip.pre_validation +
              lotSummary.wip.pdf_conversion +
              lotSummary.wip.validation >
              0 && (
              <div className="flex items-center gap-1.5 px-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                  WIP Pipeline
                </p>
                {[
                  { label: 'Scan', value: lotSummary.wip.done_scan, color: 'cyan' },
                  { label: 'Pre-Val', value: lotSummary.wip.pre_validation, color: 'amber' },
                  { label: 'PDF', value: lotSummary.wip.pdf_conversion, color: 'violet' },
                  { label: 'Validate', value: lotSummary.wip.validation, color: 'blue' },
                ].map((s) => (
                  <Badge
                    key={s.label}
                    variant="outline"
                    className={`text-[10px] gap-1 border-${s.color}-200 bg-${s.color}-50 text-${s.color}-700`}
                  >
                    {s.label}: <span className="font-black">{s.value}</span>
                  </Badge>
                ))}
              </div>
            )}
        </div>
      </Card>

      <LotBoxFilter
        lotBoxGroups={lotBoxGroups}
        lotBoxFilter={lotBoxFilter}
        setLotBoxFilter={setLotBoxFilter}
        lotBoxSelectorOpen={lotBoxSelectorOpen}
        setLotBoxSelectorOpen={setLotBoxSelectorOpen}
        lotBoxSearch={lotBoxSearch}
        setLotBoxSearch={setLotBoxSearch}
        matchedBoxGroups={matchedBoxGroups}
        visibleBoxGroups={visibleBoxGroups}
        activeBoxGroup={activeBoxGroup}
        BOX_RENDER_CAP={BOX_RENDER_CAP}
        lotIsbns={lotIsbns}
      />
    </div>
  )
}
