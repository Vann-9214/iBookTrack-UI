import { useIsMobile } from '@/hooks/use-mobile'
import { ClipboardCheck } from 'lucide-react'
import { InventoryScanModal } from './InventoryScanModal'
import { InventoryVerificationActiveSession } from './InventoryVerificationActiveSession'
import { InventoryVerificationBoxList } from './InventoryVerificationBoxList'
import { InventoryVerificationCompleteModal } from './InventoryVerificationCompleteModal'
import { MismatchDetailsModal } from '@/components/common/MismatchDetailsModal'
import type { useInventory } from '../hooks/useInventory'
import type { useInventoryActions } from '../hooks/useInventoryActions'
import type { useVerificationSession } from '../hooks/useVerificationSession'

export function InventoryVerificationTab({
  brand,
  inventory,
  actions,
  verification,
}: {
  brand: 'mustang' | 'jaguar'
  inventory: ReturnType<typeof useInventory>
  actions: ReturnType<typeof useInventoryActions>
  verification: ReturnType<typeof useVerificationSession>
}) {
  const isMobile = useIsMobile()

  if (!verification.verifSessionActive) {
    return (
      <div className="flex flex-col gap-3 min-h-0 flex-1">
        <InventoryVerificationBoxList
          boxes={actions.inventoryBoxes}
          expandedBoxId={actions.verifExpandedBoxId}
          booksByBox={actions.verifRowBooks}
          loadingBoxId={actions.loadingVerifRowBooks}
          loading={inventory.loadingBoxes}
          onToggle={actions.toggleVerifRow}
          onStartSession={(box) => verification.handleStartVerifSession(box.id)}
          loadingStartSession={verification.loadingVerifBooks}
          emptyText="No boxes to verify"
          emptySubtext="Receive boxes from the Incoming Boxes tab first."
          emptyIcon={<ClipboardCheck className="h-5 w-5" />}
          currentUserId={verification.verifUserId}
        />
        <InventoryVerificationCompleteModal verification={verification} onSuccess={() => actions.setInventoryTab('outgoing')} />
        <InventoryScanModal
          book={verification.verifFlagModalBook}
          issue={verification.verifFlagIssue}
          remarks={verification.verifFlagRemarks}
          saving={verification.verifFlagSaving}
          onIssueChange={verification.setVerifFlagIssue}
          onRemarksChange={verification.setVerifFlagRemarks}
          onClose={() => verification.setVerifFlagModalBook(null)}
          onSave={verification.saveVerifFlagFromLog}
        />
        <MismatchDetailsModal
          book={verification.verifMismatchModalBook}
          saving={verification.verifFlagSaving}
          onClose={() => verification.setVerifMismatchModalBook(null)}
          onSave={verification.saveVerifMismatchFromLog}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      {isMobile && verification.verifBox ? (
        <InventoryVerificationBoxList
          boxes={actions.inventoryBoxes}
          expandedBoxId={actions.verifExpandedBoxId}
          booksByBox={actions.verifRowBooks}
          loadingBoxId={actions.loadingVerifRowBooks}
          loading={inventory.loadingBoxes}
          onToggle={actions.toggleVerifRow}
          onStartSession={() => {}}
          loadingStartSession={verification.loadingVerifBooks}
          sessionOngoing
        />
      ) : verification.verifBox ? (
        <InventoryVerificationActiveSession brand={brand} verification={verification} />
      ) : null}
      <InventoryVerificationCompleteModal verification={verification} onSuccess={() => actions.setInventoryTab('outgoing')} />
      <InventoryScanModal
        book={verification.verifFlagModalBook}
        issue={verification.verifFlagIssue}
        remarks={verification.verifFlagRemarks}
        saving={verification.verifFlagSaving}
        onIssueChange={verification.setVerifFlagIssue}
        onRemarksChange={verification.setVerifFlagRemarks}
        onClose={() => verification.setVerifFlagModalBook(null)}
        onSave={verification.saveVerifFlagFromLog}
      />
      <MismatchDetailsModal
        book={verification.verifMismatchModalBook}
        saving={verification.verifFlagSaving}
        onClose={() => verification.setVerifMismatchModalBook(null)}
        onSave={verification.saveVerifMismatchFromLog}
      />
    </div>
  )
}
