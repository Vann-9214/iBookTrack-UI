import { useIsMobile } from '@/components/ui/use-mobile'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { InventoryScanModal } from './InventoryScanModal'
import { InventoryVerificationActiveSession } from './InventoryVerificationActiveSession'
import { InventoryVerificationBoxList } from './InventoryVerificationBoxList'
import { InventoryVerificationCompleteModal } from './InventoryVerificationCompleteModal'
import type { useInventory } from '../hooks/useInventory'
import type { useInventoryActions } from '../hooks/useInventoryActions'
import type { useVerificationSession } from '../hooks/useVerificationSession'

export function InventoryVerificationTab({
  inventory,
  actions,
  verification,
}: {
  inventory: ReturnType<typeof useInventory>
  actions: ReturnType<typeof useInventoryActions>
  verification: ReturnType<typeof useVerificationSession>
}) {
  const isMobile = useIsMobile()

  if (inventory.loadingBoxes) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading boxes...</p>
      </div>
    )
  }

  if (!verification.verifSessionActive) {
    if (actions.inventoryBoxes.length === 0) {
      return (
        <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
          <ClipboardCheck className="h-10 w-10 mb-3 text-primary" />
          <p className="font-semibold text-foreground">No boxes to verify</p>
          <p className="text-sm">Receive boxes from the Incoming Boxes tab first.</p>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3 min-h-0 flex-1">
        <InventoryVerificationBoxList
          boxes={actions.inventoryBoxes}
          expandedBoxId={actions.verifExpandedBoxId}
          booksByBox={actions.verifRowBooks}
          loadingBoxId={actions.loadingVerifRowBooks}
          onToggle={actions.toggleVerifRow}
          onStartSession={(box) => actions.openConfirm('start_session', box)}
          loadingStartSession={verification.loadingVerifBooks}
        />
        <InventoryVerificationCompleteModal verification={verification} />
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
          onToggle={actions.toggleVerifRow}
          onStartSession={() => {}}
          loadingStartSession={verification.loadingVerifBooks}
          sessionOngoing
        />
      ) : verification.verifBox ? (
        <InventoryVerificationActiveSession verification={verification} />
      ) : null}
      <InventoryVerificationCompleteModal verification={verification} />
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
    </div>
  )
}
