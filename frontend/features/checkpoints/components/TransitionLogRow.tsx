import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '../utils/checkpoints.helpers'
import { TransitionTimeline } from './TransitionTimeline'
import type { Transition } from '../types/checkpoints.types'

const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'storage']

type StatusTone = 'info' | 'success' | 'warning' | 'indigo'

interface TransitionLogRowProps {
  transition: Transition
  isExpanded: boolean
  onToggle: () => void
}

export function TransitionLogRow({
  transition: t,
  isExpanded,
  onToggle,
}: TransitionLogRowProps) {
  const box = t.box
  if (!box) return null

  let stageIdx = PIPELINE_STAGES.indexOf(box.current_stage)
  if (box.current_stage === 'transmit') stageIdx = 4
  const isCompleted = box.current_stage === 'storage' && t.storage_time_assigned != null

  let statusText = 'In progress'
  let statusTone: StatusTone = 'info'
  let holderName = '—'

  if (box.current_stage === 'warehouse') {
    holderName = t.warehouse_user_name || '—'
    if (!isCompleted) {
      if (t.warehouse_scan_name) {
        statusText = 'Received • Completed • Sent'
        statusTone = 'success'
      } else {
        statusText = 'Received'
        statusTone = 'warning'
      }
    }
  } else if (box.current_stage === 'inventory') {
    holderName = t.inventory_user_name || '—'
    if (!isCompleted) {
      if (t.inventory_send_name) {
        statusText = 'Sent'
        statusTone = 'indigo'
        holderName = t.inventory_send_name || holderName
      } else if (t.inventory_scan_name) {
        statusText = 'Completed'
        statusTone = 'success'
        holderName = t.inventory_scan_name || holderName
      } else if (t.inventory_time_received) {
        statusText = 'Received'
        statusTone = 'warning'
      }
    }
  } else if (box.current_stage === 'cut') {
    holderName = t.cut_user_name || '—'
    if (!isCompleted) {
      if (t.cut_send_name) {
        statusText = 'Sent'
        statusTone = 'indigo'
        holderName = t.cut_send_name || holderName
      } else if (t.cut_time_received) {
        statusText = 'Received'
        statusTone = 'warning'
      }
    }
  } else if (box.current_stage === 'endorsement') {
    holderName = t.endorsement_user_name || '—'
    if (!isCompleted) {
      if (t.endorsement_send_name) {
        statusText = 'Sent'
        statusTone = 'indigo'
        holderName = t.endorsement_send_name || holderName
      } else if (t.endorsement_scan_name) {
        statusText = 'Completed'
        statusTone = 'success'
        holderName = t.endorsement_scan_name || holderName
      } else if (t.endorsement_time_received) {
        statusText = 'Received'
        statusTone = 'warning'
      }
    }
  } else if (box.current_stage === 'scan' || box.current_stage === 'transmit') {
    holderName = t.scan_user_name || '—'
    if (box.current_stage === 'transmit') {
      statusText = 'Transmitted'
      statusTone = 'info'
    } else if (t.scan_time_received) {
      statusText = 'Received'
      statusTone = 'warning'
    }
  } else if (box.current_stage === 'storage') {
    holderName = t.storage_user_name || t.scan_user_name || '—'
  }

  if (isCompleted) {
    statusText = 'Completed'
    statusTone = 'success'
  }

  const statusStyles: Record<StatusTone, string> = {
    success: 'bg-success/10 text-success ring-success/25 dark:bg-success/15',
    warning: 'bg-warning/15 text-warning-foreground ring-warning/30 dark:text-warning',
    indigo: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/25 dark:text-indigo-400',
    info: 'bg-sky-500/10 text-sky-600 ring-sky-500/25 dark:text-sky-400',
  }
  const statusDotStyles: Record<StatusTone, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    indigo: 'bg-indigo-500',
    info: 'bg-sky-500',
  }

  return (
    <div className="premium-gradient-ui-card__row group border-b border-border/50 last:border-0 flex flex-col bg-card transition-colors">
      <div
        className="flex items-center px-6 py-2 cursor-pointer gap-4"
        onClick={onToggle}
      >
        <div className="w-[260px] shrink-0 flex items-center">
          <div className="w-[110px] shrink-0 flex flex-col mr-2">
            <span className="font-bold text-foreground text-sm truncate">{box.box_number}</span>
            {box.lot?.lot_number && (
              <span className="text-[10px] text-muted-foreground font-semibold truncate">
                {box.lot.lot_number}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 w-[140px]">
            <div className="flex items-center gap-1">
              {PIPELINE_STAGES.map((s, i) => {
                const isPast = isCompleted || i < stageIdx
                const isCurrent = !isCompleted && i === stageIdx
                return (
                  <div
                    key={s}
                    title={s}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      isPast && 'bg-success',
                      isCurrent && 'bg-sky-500 shadow-[0_0_0_2px_rgba(14,165,233,0.2)]',
                      !isPast && !isCurrent && 'bg-muted-foreground/20'
                    )}
                  />
                )
              })}
            </div>
            <span className="text-[10px] text-muted-foreground capitalize font-semibold truncate">
              {box.current_stage}
            </span>
          </div>
        </div>

        <div className="w-[190px] shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap ring-1 ring-inset',
              statusStyles[statusTone]
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', statusDotStyles[statusTone])} />
            {statusText}
          </span>
        </div>

        <div className="w-[140px] shrink-0 flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {t.total_processable_books ?? 0} / {box.total_expected_books ?? 0}
          </span>
        </div>

        <div className="w-[140px] shrink-0 flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {box.total_transmitted_books ?? 0} / {t.total_processable_books ?? 0}
          </span>
        </div>

        <div className="w-[170px] shrink-0 flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate" title={holderName}>
              {holderName}
            </span>
          </div>
        </div>

        <div className="w-[120px] shrink-0 flex flex-col items-end justify-center ml-auto pr-4">
          <span className="text-xs font-medium text-muted-foreground">
            {t.updated_at ? formatTime(t.updated_at) : '—'}
          </span>
          {box.created_at && (
            <span className="text-[10px] text-muted-foreground opacity-75 mt-0.5">
              {new Date(box.created_at).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        <div className="text-muted-foreground group-hover:text-[var(--brand-strong)] transition-colors">
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', isExpanded && 'rotate-180')} />
        </div>
      </div>

      {isExpanded && <TransitionTimeline transition={t} stageIdx={stageIdx} isCompleted={isCompleted} />}
    </div>
  )
}
