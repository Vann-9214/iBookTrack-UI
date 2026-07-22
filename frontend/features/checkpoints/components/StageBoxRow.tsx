import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getRelevantTimeForBox, getStageBoxRowInfo } from '../utils/checkpoints.helpers'
import { BoxActionButton } from './BoxActionButton'
import { StageBoxBooksTable } from './StageBoxBooksTable'
import type { BoxItem, Stage, Transition, ConfirmActionType, StageBoxDetail } from '../types/checkpoints.types'

interface StageBoxRowProps {
  box: BoxItem
  brand: string
  selectedStage: Stage
  isExpanded: boolean
  details?: StageBoxDetail
  latestTransition?: Transition
  actionInProgress: {
    advancing: string | null
    receiving: string | null
    sendingForward: string | null
    checkingSimflexBoxId: string | null
  }
  onToggle: () => void
  onConfirm: (box: BoxItem, action: ConfirmActionType) => void
}

export function StageBoxRow({
  box,
  brand,
  selectedStage,
  isExpanded,
  details,
  latestTransition,
  actionInProgress,
  onToggle,
  onConfirm,
}: StageBoxRowProps) {
  const { actionLabel, byName, timeStr } = getStageBoxRowInfo(box, selectedStage, latestTransition)
  const relevantTime = getRelevantTimeForBox(box, selectedStage)
  const parsedTime = relevantTime ? new Date(relevantTime).getTime() : 0
  const diffDays = parsedTime ? (Date.now() - parsedTime) / (1000 * 60 * 60 * 24) : 0
  const isDelayed = diffDays >= 1
  const isJaguar = brand === 'jaguar'

  const rowBg = isDelayed ? 'bg-orange-50/50' : isJaguar ? 'bg-green-50/30' : 'bg-blue-50/30'
  const rowBorder = isDelayed
    ? 'border-orange-300 hover:border-orange-400'
    : isJaguar
      ? 'border-green-300 hover:border-green-400'
      : 'border-blue-300 hover:border-blue-400'
  const rowHoverBg = isDelayed ? 'hover:bg-orange-50' : isJaguar ? 'hover:bg-green-50' : 'hover:bg-blue-50'

  return (
    <div
      id={`box-${box.id}`}
      className={cn(
        'rounded-lg border overflow-hidden transition-all',
        rowBg,
        rowBorder,
        isExpanded && 'shadow-md'
      )}
    >
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 cursor-pointer group transition-colors gap-3',
          rowHoverBg
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn('text-sm font-bold truncate', isDelayed ? 'text-orange-900' : 'text-foreground')}>
                BOX: {box.box_number}
              </p>
              {isDelayed && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-600 border border-orange-200 shadow-sm">
                  Delayed
                </span>
              )}
            </div>
            <p className={cn('text-xs truncate mt-0.5', isDelayed ? 'text-orange-700/80' : 'text-muted-foreground')}>
              {box.lot?.lot_number || 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-6 text-left shrink-0">
          <div className="min-w-[80px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Books</span>
            <span className="text-xs font-semibold text-foreground">
              {box.box_sessions?.[0]?.total_processable_books ?? 0} / {box.total_expected_books ?? 0}
            </span>
          </div>
          {selectedStage !== 'scan' && actionLabel !== 'Scanned' && selectedStage !== 'storage' && actionLabel !== 'Completed' && (
            <div className="min-w-[130px] col-span-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">{actionLabel} By</span>
              <span className="text-xs font-semibold text-foreground truncate block max-w-[120px]" title={byName}>
                {byName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 ml-auto pl-4">
          {selectedStage !== 'scan' && actionLabel !== 'Scanned' && selectedStage !== 'storage' && actionLabel !== 'Completed' && (
            <div className="text-left sm:text-right shrink-0 min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">{actionLabel} At</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {timeStr
                  ? new Date(timeStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                  : 'N/A'}
              </span>
            </div>
          )}
          <div className="shrink-0 flex items-center justify-end border-l border-border/50 pl-4">
            <BoxActionButton
              box={box}
              brand={brand}
              advancing={actionInProgress.advancing}
              receiving={actionInProgress.receiving}
              sendingForward={actionInProgress.sendingForward}
              checkingSimflexBoxId={actionInProgress.checkingSimflexBoxId}
              selectedStage={selectedStage}
              onConfirm={onConfirm}
            />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border bg-slate-50 px-3 py-3">
          {!details || details.loading ? (
            <p className="text-xs text-muted-foreground py-2">Loading contents...</p>
          ) : details.books.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No scan records found for this box.</p>
          ) : (
            <StageBoxBooksTable books={details.books} selectedStage={selectedStage} simflex={details.simflex} />
          )}
        </div>
      )}
    </div>
  )
}
