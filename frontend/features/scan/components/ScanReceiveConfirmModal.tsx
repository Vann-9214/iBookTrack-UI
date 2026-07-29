import { ConfirmActionModal } from "@/components/ui/confirm-action-modal"
import { BoxEntry } from "../types/scan.types"

interface ScanReceiveConfirmModalProps {
  open: boolean
  box: BoxEntry | null
  userName: string
  receivingBox: string | null
  onCancel: () => void
  onConfirm: (box: BoxEntry) => void
}

export function ScanReceiveConfirmModal({
  open,
  box,
  userName,
  receivingBox,
  onCancel,
  onConfirm,
}: ScanReceiveConfirmModalProps) {
  return (
    <ConfirmActionModal
      open={open}
      title="Confirm Receipt"
      description={
        <><strong>{userName || 'You'}</strong> will receive <strong>{box?.box_number}</strong> from <strong>Book Endorsement</strong>.</>
      }
      hint="Make sure you have physically received the box."
      flow={{
        from: 'Book Endorsement',
        to: 'Scan',
        fromColor: 'premium-gradient-ui-card--solid text-white border-transparent',
        toColor: 'premium-gradient-ui-card--solid text-white border-transparent',
      }}
      confirmLabel="Yes, Receive"
      loading={!!receivingBox}
      onCancel={onCancel}
      onConfirm={() => {
        if (!box) return
        onConfirm(box)
      }}
    />
  )
}
