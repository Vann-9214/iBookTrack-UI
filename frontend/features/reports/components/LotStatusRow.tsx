import React from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { LotStatusRow } from '../types/reports.types'
import { STATUS_META, calculateLotProgress } from '../utils/reports.helpers'
import { LotBoxDetails } from './LotBoxDetails'
import { cn } from '@/lib/utils'

interface LotStatusRowProps {
  brand: string
  lot: LotStatusRow
  isExpanded: boolean
  onToggle: () => void
  currentPage: number
  onPageChange: (page: number) => void
}

export const LotStatusRowComponent: React.FC<LotStatusRowProps> = ({
  brand,
  lot,
  isExpanded,
  onToggle,
  currentPage,
  onPageChange,
}) => {
  const meta = STATUS_META[lot.computed_status]
  const Icon = meta.icon
  const pct = calculateLotProgress(lot)

  return (
    <React.Fragment>
      <tr onClick={onToggle} className="hover:bg-muted/30 transition-colors cursor-pointer group">
        <td className="px-4 py-3 font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform text-muted-foreground group-hover:text-foreground',
                isExpanded ? 'rotate-180' : '-rotate-90'
              )}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2 font-bold text-foreground group-hover:text-primary transition-colors">
                {lot.lot_number}
                {lot.is_stalled && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
              </div>
              {lot.simflex_breakdown && Object.keys(lot.simflex_breakdown).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {Object.entries(lot.simflex_breakdown).map(([stage, count]) => (
                    <span
                      key={stage}
                      className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground border border-border/50"
                    >
                      {stage}: <span className="text-foreground">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap', meta.bg, meta.color)}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {meta.label}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          <span title={`${lot.active_boxes} active, ${lot.stored_boxes} stored`}>
            {lot.total_boxes}
            {lot.active_boxes > 0 && (
              <span className="ml-1 text-[10px] text-blue-500">({lot.active_boxes} active)</span>
            )}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={cn('px-2 py-1 rounded-md text-xs font-semibold border', brand === 'jaguar' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>
            {lot.transmitted}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={cn('px-2 py-1 rounded-md text-xs font-semibold border', brand === 'jaguar' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>
            {lot.pending}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={cn('px-2 py-1 rounded-md text-xs font-semibold border', brand === 'jaguar' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>
            {lot.non_processable}
          </span>
        </td>
        <td className="px-4 py-3 min-w-[140px]">
          {lot.total_boxes > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-9 text-right">{pct}%</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No boxes</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <LotBoxDetails
          brand={brand}
          boxes={lot.boxes || []}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      )}
    </React.Fragment>
  )
}
