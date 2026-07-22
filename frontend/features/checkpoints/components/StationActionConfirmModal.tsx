import { ArrowRight } from 'lucide-react'
import { STAGE_ORDER, STAGE_META } from '../utils/checkpoints.helpers'
import type { BoxItem, ConfirmActionType } from '../types/checkpoints.types'

interface StationActionConfirmModalProps {
  confirmBox: BoxItem
  confirmActionType: ConfirmActionType
  onCancel: () => void
  onConfirm: () => void
}

export function StationActionConfirmModal({
  confirmBox,
  confirmActionType,
  onCancel,
  onConfirm,
}: StationActionConfirmModalProps) {
  const fromMeta =
    confirmActionType === 'receive'
      ? STAGE_META[STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) - 1]]
      : STAGE_META[confirmBox.current_stage]

  const toMeta =
    confirmActionType === 'receive'
      ? STAGE_META[confirmBox.current_stage]
      : confirmActionType === 'send_forward'
      ? { color: 'bg-blue-50 text-blue-700 border-blue-300', label: 'Sent' }
      : STAGE_META[
          confirmBox.current_stage === 'scan'
            ? 'storage'
            : STAGE_ORDER[STAGE_ORDER.indexOf(confirmBox.current_stage) + 1]
        ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-foreground mb-4">
          {confirmActionType === 'receive'
            ? 'Confirm Receive'
            : confirmActionType === 'send_forward'
            ? 'Confirm Send/Complete'
            : 'Confirm Move'}
        </h3>
        <p className="text-sm text-muted-foreground mb-1">
          {confirmActionType === 'receive' ? (
            <>
              Receive <span className="font-semibold text-foreground">{confirmBox.box_number}</span> at{' '}
              {STAGE_META[confirmBox.current_stage]?.label}?
            </>
          ) : confirmActionType === 'send_forward' ? (
            <>
              Mark <span className="font-semibold text-foreground">{confirmBox.box_number}</span> as
              completed/sent?
            </>
          ) : (
            <>
              Move <span className="font-semibold text-foreground">{confirmBox.box_number}</span> from
            </>
          )}
        </p>

        <div className="flex items-center gap-2 mb-4 mt-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              fromMeta?.color || 'bg-gray-100'
            }`}
          >
            {fromMeta?.label || 'Previous'}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              toMeta?.color || 'bg-gray-100'
            }`}
          >
            {toMeta?.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-4 mt-2">
          {confirmActionType === 'advance'
            ? 'Make sure the box has physically arrived at the next station before confirming.'
            : confirmActionType === 'receive'
            ? 'Make sure you have physically received the box.'
            : 'Are you sure you want to finalize this step?'}
        </p>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Yes, Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
