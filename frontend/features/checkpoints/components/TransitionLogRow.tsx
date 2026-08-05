import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '../utils/checkpoints.helpers'
import { TransitionTimeline } from './TransitionTimeline'
import type { Transition } from '../types/checkpoints.types'

const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'storage']

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
  let statusColor = 'bg-blue-100 text-blue-700'
  let holderName = '—'
  let holderStage = ''

  if (box.current_stage === 'warehouse') {
    holderName = t.warehouse_user_name || '—'
    holderStage = 'Warehouse'
    if (!isCompleted) {
      if (t.warehouse_scan_name) {
        statusText = 'Received • Completed • Sent'
        statusColor = 'bg-green-100 text-green-700'
      } else {
        statusText = 'Received'
        statusColor = 'bg-yellow-100 text-yellow-700'
      }
    }
  } else if (box.current_stage === 'inventory') {
    holderName = t.inventory_user_name || '—'
    holderStage = 'Inventory'
    if (!isCompleted) {
      if (t.inventory_send_name) {
        statusText = 'Sent'
        statusColor = 'bg-indigo-100 text-indigo-700'
        holderName = t.inventory_send_name || holderName
      } else if (t.inventory_scan_name) {
        statusText = 'Completed'
        statusColor = 'bg-green-100 text-green-700'
        holderName = t.inventory_scan_name || holderName
      } else if (t.inventory_time_received) {
        statusText = 'Received'
        statusColor = 'bg-yellow-100 text-yellow-700'
      }
    }
  } else if (box.current_stage === 'cut') {
    holderName = t.cut_user_name || '—'
    holderStage = 'Cut'
    if (!isCompleted) {
      if (t.cut_send_name) {
        statusText = 'Sent'
        statusColor = 'bg-indigo-100 text-indigo-700'
        holderName = t.cut_send_name || holderName
      } else if (t.cut_time_received) {
        statusText = 'Received'
        statusColor = 'bg-yellow-100 text-yellow-700'
      }
    }
  } else if (box.current_stage === 'endorsement') {
    holderName = t.endorsement_user_name || '—'
    holderStage = 'Endorsement'
    if (!isCompleted) {
      if (t.endorsement_send_name) {
        statusText = 'Sent'
        statusColor = 'bg-indigo-100 text-indigo-700'
        holderName = t.endorsement_send_name || holderName
      } else if (t.endorsement_scan_name) {
        statusText = 'Completed'
        statusColor = 'bg-green-100 text-green-700'
        holderName = t.endorsement_scan_name || holderName
      } else if (t.endorsement_time_received) {
        statusText = 'Received'
        statusColor = 'bg-yellow-100 text-yellow-700'
      }
    }
  } else if (box.current_stage === 'scan' || box.current_stage === 'transmit') {
    holderName = t.scan_user_name || '—'
    holderStage = box.current_stage === 'transmit' ? 'Transmit' : 'Scan'
    if (box.current_stage === 'transmit') {
      statusText = 'Transmitted'
      statusColor = 'bg-blue-100 text-blue-700'
    } else if (t.scan_time_received) {
      statusText = 'Received'
      statusColor = 'bg-yellow-100 text-yellow-700'
    }
  } else if (box.current_stage === 'storage') {
    holderName = t.storage_user_name || t.scan_user_name || '—'
    holderStage = 'Storage'
  }

  if (isCompleted) {
    statusText = 'Completed'
    statusColor = 'bg-green-100 text-green-700'
  }

  return (
    <div className="border-b border-border/50 last:border-0 flex flex-col bg-card hover:bg-muted/30 transition-colors">
      <div
        className="flex items-center px-6 py-4 cursor-pointer gap-4"
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
          <div className="flex flex-col gap-1 w-[140px]">
            <div className="flex items-center gap-1.5">
              {PIPELINE_STAGES.map((s, i) => {
                let dotColor = 'bg-muted-foreground/30'
                if (isCompleted || i < stageIdx) dotColor = 'bg-primary'
                else if (i === stageIdx) dotColor = 'bg-primary'
                return <div key={s} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              })}
            </div>
            <span className="text-[10px] text-muted-foreground capitalize font-medium truncate">
              {box.current_stage}
            </span>
          </div>
        </div>

        <div className="w-[180px] shrink-0">
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide whitespace-nowrap ${statusColor}`}>
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

        <div className="w-[160px] shrink-0 flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground truncate" title={holderName}>
            {holderName}
          </span>
          <span className="text-[11px] text-muted-foreground">{holderStage}</span>
        </div>

        <div className="w-[120px] shrink-0 flex flex-col items-end justify-center ml-auto pr-4">
          <span className="text-xs text-muted-foreground">
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

        <div className="text-muted-foreground">
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', isExpanded && 'rotate-180')} />
        </div>
      </div>

      {isExpanded && <TransitionTimeline transition={t} stageIdx={stageIdx} isCompleted={isCompleted} />}
    </div>
  )
}
