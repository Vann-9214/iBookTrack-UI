import { ChevronDown, ChevronRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getRelevantTimeForBox, getStageBoxRowInfo, getStatusConfig, getStepStatus } from '../utils/checkpoints.helpers'
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

  const totalCount = box.box_sessions?.[0]?.total_processable_books ?? 0
  const status = getStepStatus(totalCount)
  const cfg = getStatusConfig(status, brand)

  const showMeta = selectedStage !== 'scan' && actionLabel !== 'Scanned' && selectedStage !== 'storage' && actionLabel !== 'Completed'

  return (
    <div
      id={`box-${box.id}`}
      className={cn(
        'group rounded-xl border overflow-hidden transition-all',
        isDelayed
          ? 'border-orange-200 bg-orange-50/60 hover:border-orange-300'
          : 'border-gray-100 bg-gray-50/60 hover:border-transparent',
        isExpanded && 'shadow-md'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 sm:gap-4 px-4 py-3 cursor-pointer group transition-colors',
          isDelayed ? 'hover:bg-orange-50' : 'hover:bg-white'
        )}
        onClick={onToggle}
      >
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
            isDelayed
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : cfg.iconColorCls
          )}
        >
          <Package className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
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
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="truncate">{box.lot?.lot_number || 'N/A'}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span>
              <span className="text-[10px] uppercase font-bold">Books</span>{' '}
              {totalCount} / {box.total_expected_books ?? 0}
            </span>
            {showMeta && (
              <>
                <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span className="hidden sm:inline-block truncate max-w-[120px]" title={byName}>
                  <span className="text-[10px] uppercase font-bold">{actionLabel} By</span> {byName}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 shrink-0">
          {showMeta && (
            <div className="text-right min-w-[100px]">
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
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors group-hover:bg-white">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </div>

        <div className="flex sm:hidden items-center gap-2 shrink-0">
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
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors group-hover:bg-white">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border bg-muted/30">
          {showMeta && (
            <div className="sm:hidden px-4 pt-3 pb-2 border-b border-border/50 bg-background/50 flex flex-col gap-1 text-xs text-muted-foreground">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">{actionLabel} By: </span>
                <span className="font-medium text-foreground">{byName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">{actionLabel} At: </span>
                <span className="font-medium text-foreground">
                  {timeStr
                    ? new Date(timeStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                    : 'N/A'}
                </span>
              </div>
            </div>
          )}
          {!details || details.loading ? (
            <p className="text-xs text-muted-foreground py-4 px-4">Loading contents...</p>
          ) : details.books.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 px-4">No scan records found for this box.</p>
          ) : (
            <StageBoxBooksTable books={details.books} brand={brand} selectedStage={selectedStage} simflex={details.simflex} />
          )}
        </div>
      )}
    </div>
  )
}
