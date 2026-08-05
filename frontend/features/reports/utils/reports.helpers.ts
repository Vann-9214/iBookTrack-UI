import React from 'react'
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { ComputedStatus, LotStatusRow, FilterStatus, SortKey, SortDir } from '../types/reports.types'

export const STATUS_META: Record<ComputedStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  closed:      { label: 'Closed',      color: 'text-emerald-700 dark:text-primary', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  open:        { label: 'Open',        color: 'text-amber-700 dark:text-amber-400',    bg: 'bg-amber-100 dark:bg-amber-900/30',    icon: AlertCircle },
  'in-progress': { label: 'In-Progress', color: 'text-blue-700 dark:text-primary',   bg: 'bg-blue-100 dark:bg-blue-900/30',      icon: Clock },
}

export const formatTime = (hours: number | null | undefined): string => {
  if (hours === null || hours === undefined) return '-'
  if (hours === 0) return '0m'
  const totalMins = Math.round(hours * 60)
  if (totalMins === 0) return '0m'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export const calculateLotProgress = (lot: LotStatusRow): number => {
  const totalBoxProgress = lot.boxes ? lot.boxes.reduce((sum, box) => sum + box.progress, 0) : 0
  return lot.total_boxes > 0 ? Math.round(totalBoxProgress / lot.total_boxes) : 0
}

export const filterAndSortLots = (
  lots: LotStatusRow[],
  filter: FilterStatus,
  search: string,
  sortKey: SortKey,
  sortDir: SortDir
): LotStatusRow[] => {
  return lots
    .filter(l => filter === 'all' || l.computed_status === filter)
    .filter(l => !search || l.lot_number.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av: string | number
      let bv: string | number
      if (sortKey === 'progress') {
        const aTotalProg = a.boxes ? a.boxes.reduce((s, box) => s + box.progress, 0) : 0
        const bTotalProg = b.boxes ? b.boxes.reduce((s, box) => s + box.progress, 0) : 0
        av = a.total_boxes > 0 ? aTotalProg / a.total_boxes : 0
        bv = b.total_boxes > 0 ? bTotalProg / b.total_boxes : 0
      } else {
        av = a[sortKey] ?? ''
        bv = b[sortKey] ?? ''
        if (typeof av === 'string' && typeof bv === 'string') {
          av = av.toLowerCase()
          bv = bv.toLowerCase()
        }
      }
      return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0)
    })
}
