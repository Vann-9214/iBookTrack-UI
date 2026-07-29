import { ConfirmActionModal } from '@/components/ui/confirm-action-modal'
import type { BoxEntry } from '../types/endorsement.types'

interface EndorsementActionConfirmModalProps {
  confirmModal: {
    open: boolean
    action: 'receive' | 'start_session' | 'send_to_scan' | null
    box: BoxEntry | null
  }
  inspUserName: string
  receivingBox: string | null
  loadingInspSession: boolean
  sendingToScan: string | null
  onClose: () => void
  onConfirm: () => void
}

export function EndorsementActionConfirmModal({
  confirmModal,
  inspUserName,
  receivingBox,
  loadingInspSession,
  sendingToScan,
  onClose,
  onConfirm,
}: EndorsementActionConfirmModalProps) {
  return (
    <ConfirmActionModal
      open={confirmModal.open}
      title={
        confirmModal.action === 'receive'
          ? 'Confirm Receipt'
          : confirmModal.action === 'start_session'
          ? 'Start Inspection Session'
          : 'Send to Scan'
      }
      description={
        confirmModal.action === 'receive' ? (
          <>
            <strong>{inspUserName || 'You'}</strong> will receive <strong>{confirmModal.box?.box_number}</strong> from{' '}
            <strong>Cut</strong>.
          </>
        ) : confirmModal.action === 'start_session' ? (
          <>
            Begin an inspection session on <strong>{confirmModal.box?.box_number}</strong>. Make sure the box is physically with you.
          </>
        ) : (
          <>
            Send <strong>{confirmModal.box?.box_number}</strong> to <strong>Scan</strong>? This cannot be undone.
          </>
        )
      }
      hint={
        confirmModal.action === 'receive'
          ? 'Make sure you have physically received the box.'
          : confirmModal.action === 'send_to_scan'
          ? 'Ensure all books have been inspected and endorsed before sending.'
          : undefined
      }
      flow={
        confirmModal.action === 'receive'
          ? {
              from: 'Cut',
              to: 'Book Inspection',
              fromColor: 'bg-orange-100 text-orange-700 border-orange-300',
              toColor: 'bg-purple-100 text-purple-700 border-purple-300',
            }
          : confirmModal.action === 'send_to_scan'
          ? {
              from: 'Book Inspection',
              to: 'Scan',
              fromColor: 'bg-purple-100 text-purple-700 border-purple-300',
              toColor: 'bg-green-100 text-green-700 border-green-300',
            }
          : undefined
      }
      confirmLabel={
        confirmModal.action === 'receive'
          ? 'Yes, Receive'
          : confirmModal.action === 'start_session'
          ? 'Start Session'
          : 'Yes, Send to Scan'
      }
      variant={confirmModal.action === 'send_to_scan' ? 'destructive' : 'default'}
      loading={
        (confirmModal.action === 'receive' && !!receivingBox) ||
        (confirmModal.action === 'start_session' && loadingInspSession) ||
        (confirmModal.action === 'send_to_scan' && !!sendingToScan)
      }
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  )
}
