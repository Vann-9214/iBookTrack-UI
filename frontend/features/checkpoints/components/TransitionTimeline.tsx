import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Transition } from '../types/checkpoints.types'

const PIPELINE_STAGES = ['warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'storage']

interface TransitionTimelineProps {
  transition: Transition
  stageIdx: number
  isCompleted: boolean
}

export function TransitionTimeline({
  transition: t,
  stageIdx,
  isCompleted,
}: TransitionTimelineProps) {
  let exactProgress = stageIdx

  if (!isCompleted) {
    if (stageIdx === 0) {
      if (t.warehouse_scan_name) exactProgress += 0.5
    } else if (stageIdx === 1) {
      // "If completed move forward a bit on line, and if sent move forward again"
      if (t.inventory_send_name) exactProgress += 0.66
      else if (t.inventory_scan_name) exactProgress += 0.33
    } else if (stageIdx === 2) {
      if (t.cut_send_name) exactProgress += 0.5
    } else if (stageIdx === 3) {
      if (t.endorsement_send_name) exactProgress += 0.66
      else if (t.endorsement_scan_name) exactProgress += 0.33
    }
  } else {
    exactProgress = PIPELINE_STAGES.length - 1
  }

  return (
    <div className="px-4 sm:px-6 py-6 bg-muted/20 border-t border-border/50 shadow-[inset_0_4px_12px_-6px_rgba(0,0,0,0.05)] rounded-b-xl overflow-x-auto relative">
      <div className="flex items-start relative min-w-[900px]">
        {/* Lines Container (spanning from exact center of first item to exact center of last item) */}
        <div className="absolute top-3 left-[8.333%] right-[8.333%] h-[2px]">
          {/* Background line */}
          <div className="absolute inset-0 bg-border z-0" />
          {/* Progress line */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-primary z-0 transition-all duration-500 ease-out"
            style={{
              width: `${(exactProgress / (PIPELINE_STAGES.length - 1)) * 100}%`,
            }}
          />
        </div>

        {PIPELINE_STAGES.map((s, i) => {
          const isPast = isCompleted || i < stageIdx
          const isCurrent = i === stageIdx

          let icon = <div className="w-6 h-6 rounded-full bg-muted border-2 border-background z-10" />
          if (isPast) {
            icon = (
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center z-10 border-2 border-background shadow-sm">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
            )
          } else if (isCurrent) {
            icon = (
              <div className="w-6 h-6 rounded-full bg-primary z-10 border-2 border-background shadow-sm flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )
          }

          let recvTime: string | null = null
          let recvUser: string | undefined = undefined
          let scanTime: string | null = null
          let scanUser: string | undefined = undefined
          let sendTime: string | null = null
          let sendUser: string | undefined = undefined

          if (s === 'warehouse') {
            recvTime = t.warehouse_time_received || null
            recvUser = t.warehouse_user_name
            scanTime = t.warehouse_scan_at || null
            scanUser = t.warehouse_scan_name
          } else if (s === 'inventory') {
            recvTime = t.inventory_time_received || null
            recvUser = t.inventory_user_name
            scanTime = t.inventory_scan_at || null
            scanUser = t.inventory_scan_name
            sendTime = t.inventory_time_send || null
            sendUser = t.inventory_send_name
          } else if (s === 'cut') {
            recvTime = t.cut_time_received || null
            recvUser = t.cut_user_name
            sendTime = t.cut_time_send || null
            sendUser = t.cut_send_name
          } else if (s === 'endorsement') {
            recvTime = t.endorsement_time_received || null
            recvUser = t.endorsement_user_name
            scanTime = t.endorsement_scan_at || null
            scanUser = t.endorsement_scan_name
            sendTime = t.endorsement_time_send || null
            sendUser = t.endorsement_send_name
          } else if (s === 'scan') {
            recvTime = t.scan_time_received || null
            recvUser = t.scan_user_name
          } else if (s === 'storage') {
            recvTime = t.storage_time_assigned || null
            recvUser = t.storage_user_name
          }

          const anyTime = recvTime || scanTime || sendTime

          return (
            <div key={s} className="flex flex-col items-center flex-1 z-10 relative px-1 min-w-[120px]">
              {icon}
              <span
                className={cn(
                  'text-[11px] font-bold mt-2 capitalize text-center',
                  isPast || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {s}
              </span>
              <div className="mt-1 flex flex-col items-center text-[10px] text-muted-foreground text-center w-full">
                {!anyTime && <span className="opacity-50">not logged</span>}
                <div className="flex flex-col text-[10px] text-muted-foreground w-full items-center gap-0.5">
                  {s === 'warehouse' ? (
                    anyTime && (
                      <span className="whitespace-nowrap text-[10px] text-center">
                        ↓ ✓ ↑ {(scanUser || recvUser)?.split(' ')[0] || 'System'},{' '}
                        {new Date(scanTime || recvTime || '').toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        }).toLowerCase()}
                      </span>
                    )
                  ) : (
                    <>
                      {recvTime && (
                        <span className="whitespace-nowrap text-[10px] text-center">
                          ↓ {recvUser?.split(' ')[0] || 'System'},{' '}
                          {new Date(recvTime).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          }).toLowerCase()}
                        </span>
                      )}
                      {scanTime && (
                        <span className="whitespace-nowrap text-[10px] text-center mt-0.5">
                          ✓ {scanUser?.split(' ')[0] || 'System'},{' '}
                          {new Date(scanTime).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          }).toLowerCase()}
                        </span>
                      )}
                      {sendTime && (
                        <span className="whitespace-nowrap text-[10px] text-center mt-0.5">
                          ↑ {sendUser?.split(' ')[0] || 'System'},{' '}
                          {new Date(sendTime).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          }).toLowerCase()}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
