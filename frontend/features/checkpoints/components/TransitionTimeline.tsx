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
  return (
    <div className="px-6 py-4 bg-muted/20 border-t border-border overflow-x-auto">
      <div className="flex items-start justify-between relative px-2 min-w-[600px]">
        {/* Connecting background line */}
        <div className="absolute top-3 left-10 right-10 h-[2px] bg-border z-0" />
        {/* Progress line */}
        <div
          className="absolute top-3 left-10 h-[2px] bg-green-500 z-0 transition-all duration-500"
          style={{
            width: `calc(${isCompleted ? 100 : (stageIdx / (PIPELINE_STAGES.length - 1)) * 100}% - 80px)`,
          }}
        />

        {PIPELINE_STAGES.map((s, i) => {
          const isPast = isCompleted || i < stageIdx
          const isCurrent = i === stageIdx

          let icon = <div className="w-6 h-6 rounded-full bg-muted border-2 border-background z-10" />
          if (isPast) {
            icon = (
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center z-10 border-2 border-background shadow-sm">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
            )
          } else if (isCurrent) {
            icon = (
              <div className="w-6 h-6 rounded-full bg-blue-500 z-10 border-2 border-background shadow-sm flex items-center justify-center">
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
            <div key={s} className="flex flex-col items-center flex-1 z-10 relative">
              {icon}
              <span
                className={cn(
                  'text-[11px] font-bold mt-2 capitalize',
                  isPast || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {s}
              </span>
              <div className="mt-1 flex flex-col items-center text-[10px] text-muted-foreground text-center">
                {!anyTime && <span className="opacity-50">not logged</span>}
                <div className="flex flex-col text-[10px] text-muted-foreground">
                  {s === 'warehouse' ? (
                    anyTime && (
                      <span className="whitespace-nowrap">
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
                        <span className="whitespace-nowrap">
                          ↓ {recvUser?.split(' ')[0] || 'System'},{' '}
                          {new Date(recvTime).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          }).toLowerCase()}
                        </span>
                      )}
                      {scanTime && (
                        <span className="whitespace-nowrap mt-0.5">
                          ✓ {scanUser?.split(' ')[0] || 'System'},{' '}
                          {new Date(scanTime).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          }).toLowerCase()}
                        </span>
                      )}
                      {sendTime && (
                        <span className="whitespace-nowrap mt-0.5">
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
