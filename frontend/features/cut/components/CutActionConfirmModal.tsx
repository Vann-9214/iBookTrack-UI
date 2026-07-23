import React from 'react'
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal'
import { ConfirmModalState } from '../types/cut.types'

interface CutActionConfirmModalProps {
  confirmModal: ConfirmModalState
  userName: string
  receivingBox: string | null
  sendingBox: string | null
  onClose: () => void
  onConfirmReceive: () => void
  onConfirmSend: () => void
}

export const CutActionConfirmModal: React.FC<CutActionConfirmModalProps> = ({
  confirmModal,
  userName,
  receivingBox,
  sendingBox,
  onClose,
  onConfirmReceive,
  onConfirmSend,
}) => {
  return (
    <ConfirmActionModal
      open={confirmModal.open}
      title={confirmModal.action === 'receive' ? 'Confirm Receipt' : 'Send to Endorsement'}
      description={
        confirmModal.action === 'receive' ? (
          <><strong>{userName || 'You'}</strong> will receive <strong>{confirmModal.box?.box_number}</strong> from <strong>Inventory</strong>.</>
        ) : (
          <>Send <strong>{confirmModal.box?.box_number}</strong> to <strong>Book Endorsement</strong>? This cannot be undone.</>
        )
      }
      hint={
        confirmModal.action === 'receive' ? 'Make sure you have physically received the box.' :
        'Ensure all cutting for this box is complete before sending.'
      }
      flow={
        confirmModal.action === 'receive'
          ? { from: 'Inventory', to: 'Cut', fromColor: 'bg-blue-100 text-blue-700 border-blue-300', toColor: 'bg-orange-100 text-orange-700 border-orange-300' }
          : { from: 'Cut', to: 'Book Endorsement', fromColor: 'bg-orange-100 text-orange-700 border-orange-300', toColor: 'bg-purple-100 text-purple-700 border-purple-300' }
      }
      confirmLabel={confirmModal.action === 'receive' ? 'Yes, Receive' : 'Yes, Send to Endorsement'}
      variant={confirmModal.action === 'send' ? 'destructive' : 'default'}
      loading={
        (confirmModal.action === 'receive' && !!receivingBox) ||
        (confirmModal.action === 'send' && !!sendingBox)
      }
      onCancel={onClose}
      onConfirm={() => {
        if (!confirmModal.box) return
        onClose()
        if (confirmModal.action === 'receive') onConfirmReceive()
        else onConfirmSend()
      }}
    />
  )
}
