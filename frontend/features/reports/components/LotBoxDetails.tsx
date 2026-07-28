import React from 'react'
import { AlertCircle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LotBox } from '../types/reports.types'
import { formatTime } from '../utils/reports.helpers'
import { cn } from '@/lib/utils'

interface LotBoxDetailsProps {
  brand: string
  boxes: LotBox[]
  currentPage: number
  onPageChange: (page: number) => void
}

export const LotBoxDetails: React.FC<LotBoxDetailsProps> = ({
  brand,
  boxes,
  currentPage,
  onPageChange,
}) => {
  if (!boxes || boxes.length === 0) {
    return (
      <tr className="bg-muted/5 border-b">
        <td colSpan={8} className="px-10 py-8 text-sm text-muted-foreground text-center flex flex-col items-center justify-center gap-2">
          <Package className="h-8 w-8 opacity-20" />
          No boxes have been created for this lot yet.
        </td>
      </tr>
    )
  }

  const BOXES_PER_PAGE = 50
  const totalPages = Math.max(1, Math.ceil(boxes.length / BOXES_PER_PAGE))
  const pagedBoxes = boxes.slice((currentPage - 1) * BOXES_PER_PAGE, currentPage * BOXES_PER_PAGE)

  return (
    <tr className="bg-muted/10 border-b shadow-inner">
      <td colSpan={8} className="p-0">
        <div className="border-l-4 border-primary/30 my-0 overflow-hidden bg-background/50">
          <div className="max-h-[500px] overflow-y-auto w-full">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  <th className="px-6 py-2 text-left font-semibold text-muted-foreground w-32">Box Number</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground w-28">Stage</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground w-24">Duration</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground w-24">Turnaround</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground min-w-[200px]">Progress</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted-foreground w-16">Total</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted-foreground w-24">Processable</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted-foreground w-20">Pending</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted-foreground w-16">WIP</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted-foreground w-24">Transmitted</th>
                  <th className="px-6 py-2 text-right font-semibold text-muted-foreground w-24">Non-Processable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pagedBoxes.map(box => (
                  <tr key={box.box_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-1.5 font-medium text-foreground whitespace-nowrap">{box.box_number}</td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm shrink-0', box.current_stage === 'storage' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground')}>
                        {box.current_stage}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      {box.time_in_stage !== null && box.time_in_stage !== undefined ? (
                        <span className={cn('flex items-center gap-1 text-[11px] font-medium', box.is_stalled ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                          {box.is_stalled && <AlertCircle className="h-3 w-3" />}
                          {formatTime(box.time_in_stage)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground">
                      {formatTime(box.turnaround_time)}
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-2 max-w-[300px]">
                        <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500', box.progress === 100 && 'bg-emerald-500')}
                            style={{ width: `${box.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 font-medium tabular-nums">{box.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-right text-muted-foreground tabular-nums">{box.total_books}</td>
                    <td className="px-4 py-1.5 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{box.processable}</td>
                    <td className="px-4 py-1.5 text-right font-medium text-amber-600 dark:text-amber-400 tabular-nums">{box.pending_books || 0}</td>
                    <td className="px-4 py-1.5 text-right font-medium text-blue-600 dark:text-blue-400 tabular-nums">{box.wip_books || 0}</td>
                    <td className="px-4 py-1.5 text-right font-medium text-violet-600 dark:text-violet-400 tabular-nums">{box.transmitted_books || 0}</td>
                    <td className="px-6 py-1.5 text-right font-medium text-red-600 dark:text-red-400 tabular-nums">
                      {box.non_processable > 0 ? box.non_processable : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-6 py-2.5 border-t bg-muted/10">
            <span className="text-xs font-medium text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs px-2.5"
                disabled={currentPage === 1}
                onClick={(e) => { e.stopPropagation(); onPageChange(currentPage - 1); }}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs px-2.5"
                disabled={currentPage === totalPages}
                onClick={(e) => { e.stopPropagation(); onPageChange(currentPage + 1); }}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}
