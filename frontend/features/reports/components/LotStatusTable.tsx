import React from 'react'
import { Loader2, Package, BookOpen, ChevronUp, ChevronDown } from 'lucide-react'
import { LotStatusRow as LotStatusRowType, SortKey, SortDir } from '../types/reports.types'
import { LotStatusRowComponent } from './LotStatusRow'
import { cn } from '@/lib/utils'

interface LotStatusTableProps {
  brand: string
  lots: LotStatusRowType[]
  filteredLots: LotStatusRowType[]
  loading: boolean
  error: string | null
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  expandedLots: Set<string>
  onToggleLot: (lotId: string) => void
  boxPageByLot: Record<string, number>
  onPageChange: (lotId: string, page: number) => void
}

export const LotStatusTable: React.FC<LotStatusTableProps> = ({
  brand,
  lots,
  filteredLots,
  loading,
  error,
  sortKey,
  sortDir,
  onSort,
  expandedLots,
  onToggleLot,
  boxPageByLot,
  onPageChange,
}) => {
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="h-3 w-3 opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  const thCls = (k: SortKey) =>
    cn(
      'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors',
      sortKey === k && 'text-foreground'
    )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading lot statuses…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="font-medium text-destructive">Failed to load</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  if (filteredLots.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No lots match the current filter.
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border shadow-sm overflow-hidden',
        brand === 'jaguar' ? 'border-green-200 bg-white' : 'border-blue-200 bg-white'
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className={cn(
              'border-b',
              brand === 'jaguar' ? 'border-green-200 bg-green-50/50' : 'border-blue-200 bg-blue-50/50'
            )}
          >
            <tr>
              <th className={thCls('lot_number')} onClick={() => onSort('lot_number')}>
                <span className="flex items-center gap-1">
                  Lot Number <SortIcon k="lot_number" />
                </span>
              </th>
              <th className={thCls('computed_status')} onClick={() => onSort('computed_status')}>
                <span className="flex items-center gap-1">
                  Status <SortIcon k="computed_status" />
                </span>
              </th>
              <th className={thCls('total_boxes')} onClick={() => onSort('total_boxes')}>
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />Boxes <SortIcon k="total_boxes" />
                </span>
              </th>
              <th className={thCls('transmitted')} onClick={() => onSort('transmitted')}>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />Transmitted <SortIcon k="transmitted" />
                </span>
              </th>
              <th className={thCls('pending')} onClick={() => onSort('pending')}>
                <span className="flex items-center gap-1">
                  Pending <SortIcon k="pending" />
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Non-Processable
              </th>
              <th className={thCls('progress')} onClick={() => onSort('progress')}>
                <span className="flex items-center gap-1">
                  Progress <SortIcon k="progress" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className={cn('divide-y', brand === 'jaguar' ? 'divide-green-100' : 'divide-blue-100')}>
            {filteredLots.map(lot => (
              <LotStatusRowComponent
                key={lot.lot_id}
                brand={brand}
                lot={lot}
                isExpanded={expandedLots.has(lot.lot_id)}
                onToggle={() => onToggleLot(lot.lot_id)}
                currentPage={boxPageByLot[lot.lot_id] || 1}
                onPageChange={page => onPageChange(lot.lot_id, page)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        Showing {filteredLots.length} of {lots.length} lots
      </div>
    </div>
  )
}
