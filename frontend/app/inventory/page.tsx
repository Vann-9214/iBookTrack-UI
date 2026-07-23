'use client'

import { useCallback } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import { useInventory } from '@/features/inventory/hooks/useInventory'
import { useInventoryActions } from '@/features/inventory/hooks/useInventoryActions'
import { useVerificationSession } from '@/features/inventory/hooks/useVerificationSession'
import { InventoryDeleteModal } from '@/features/inventory/components/InventoryDeleteModal'
import { InventoryHeader } from '@/features/inventory/components/InventoryHeader'
import { InventoryIncomingTab } from '@/features/inventory/components/InventoryIncomingTab'
import { InventoryOutgoingTab } from '@/features/inventory/components/InventoryOutgoingTab'
import { InventoryPrintSlip } from '@/features/inventory/components/InventoryPrintSlip'
import { InventorySearchBar } from '@/features/inventory/components/InventorySearchBar'
import { InventorySimflexModal } from '@/features/inventory/components/InventorySimflexModal'
import { InventoryTabNavigation } from '@/features/inventory/components/InventoryTabNavigation'
import { InventoryVerificationTab } from '@/features/inventory/components/InventoryVerificationTab'

export default function InventoryPage() {
  const { brand, colors } = useBrand()
  const inventory = useInventory(brand)
  const verification = useVerificationSession(brand, inventory)
  const actions = useInventoryActions(brand, inventory, verification)

  const handleBoxLabelAfterPrint = useCallback(() => {
    if (actions.printBox) {
      actions.setPrintedBoxLabels((prev) => new Set(prev).add(actions.printBox!.id))
      actions.setPrintBox(null)
    }
  }, [actions.printBox])

  const handleBookSlipAfterPrint = useCallback(() => {
    if (actions.printBook) {
      const { box, book } = actions.printBook
      actions.setPrintedBookSlips((prev) => {
        const next = { ...prev }
        const existing = next[box.id] ? new Set(next[box.id]) : new Set<string>()
        existing.add(book.id)
        next[box.id] = existing
        return next
      })
      actions.setPrintBook(null)
      actions.setLoadingBookPrint(null)
    }
  }, [actions.printBook])

  const confirmActionTitle =
    actions.confirmModal.action === 'receive' ? 'Confirm Receipt' :
    actions.confirmModal.action === 'start_session' ? 'Start Verification Session' :
    'Send to Cut'

  return (
    <>
      {actions.deleteConfirm && (
        <InventoryDeleteModal boxNumber={actions.deleteConfirm.box_number} deleting={actions.deleting} onCancel={() => actions.setDeleteConfirm(null)} onConfirm={actions.handleDeleteBox} />
      )}
      {actions.printBox && <InventoryPrintSlip box={actions.printBox} books={actions.printBooks} bookType={actions.printBookType} onAfterPrint={handleBoxLabelAfterPrint} />}
      {actions.printBook && <InventoryPrintSlip box={actions.printBook.box} book={actions.printBook.book} onAfterPrint={handleBookSlipAfterPrint} />}
      {actions.simflexModal && <InventorySimflexModal state={actions.simflexModal} onClose={() => actions.setSimflexModal(null)} onRetry={actions.handleCheckSimflex} />}

      <div className={cn('flex h-screen bg-background font-sans print:hidden', `theme-${brand}`)}>
        <DashboardSidebar navigationLocked={verification.verifSessionActive} />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <DashboardNavbar disableBrandToggle={verification.verifSessionActive} navigationLocked={verification.verifSessionActive} />
          <main className="ambient-bg flex-1 overflow-auto flex flex-col p-4 md:p-6 lg:p-8">
            <div className={cn('mx-auto w-full flex-1 flex flex-col', verification.verifSessionActive ? 'max-w-full' : 'max-w-6xl')}>
              <InventoryHeader brand={brand} />
              {!verification.verifSessionActive && (
                <InventorySearchBar searchType={inventory.searchType} searchQuery={inventory.searchQuery} onTypeChange={inventory.setSearchType} onQueryChange={inventory.setSearchQuery} />
              )}
              <InventoryTabNavigation
                tab={actions.inventoryTab}
                onTabChange={actions.setInventoryTab}
                counts={{ incoming: actions.incomingBoxes.length, verification: actions.inventoryBoxes.length, outgoing: actions.outgoingBoxes.length }}
                refreshing={inventory.loadingBoxes || actions.isManualRefreshing}
                onRefresh={actions.handleManualRefresh}
                lastUpdated={inventory.lastInventoryUpdate}
                disabled={verification.verifSessionActive}
                accentColor={colors.accent}
              />
              {actions.inventoryTab === 'incoming' && <InventoryIncomingTab inventory={inventory} actions={actions} />}
              {actions.inventoryTab === 'verification' && <InventoryVerificationTab inventory={inventory} actions={actions} verification={verification} />}
              {actions.inventoryTab === 'outgoing' && <InventoryOutgoingTab inventory={inventory} actions={actions} />}
            </div>
          </main>
        </div>
      </div>

      <ConfirmActionModal
        open={actions.confirmModal.open}
        title={confirmActionTitle}
        description={
          actions.confirmModal.action === 'receive' ? (
            <><strong>{verification.verifUserName || 'You'}</strong> will receive <strong>{actions.confirmModal.box?.box_number}</strong> from <strong>Warehouse</strong>.</>
          ) : actions.confirmModal.action === 'start_session' ? (
            <>Begin a verification session on <strong>{actions.confirmModal.box?.box_number}</strong>. Make sure the box is physically with you.</>
          ) : (
            <>Send <strong>{actions.confirmModal.box?.box_number}</strong> to <strong>Cut</strong>? This cannot be undone.</>
          )
        }
        hint={
          actions.confirmModal.action === 'receive' ? 'Make sure you have physically received the box.' :
          actions.confirmModal.action === 'send_to_cut' ? 'Ensure all book slips have been printed before sending.' :
          undefined
        }
        flow={
          actions.confirmModal.action === 'receive'
            ? { from: 'Warehouse', to: 'Inventory', fromColor: 'bg-amber-100 text-amber-700 border-amber-300', toColor: 'bg-blue-100 text-blue-700 border-blue-300' }
            : actions.confirmModal.action === 'send_to_cut'
              ? { from: 'Inventory', to: 'Cut', fromColor: 'bg-blue-100 text-blue-700 border-blue-300', toColor: 'bg-orange-100 text-orange-700 border-orange-300' }
              : undefined
        }
        confirmLabel={
          actions.confirmModal.action === 'receive' ? 'Yes, Receive' :
          actions.confirmModal.action === 'start_session' ? 'Start Session' :
          'Yes, Send to Cut'
        }
        variant={actions.confirmModal.action === 'send_to_cut' ? 'destructive' : 'default'}
        loading={
          (actions.confirmModal.action === 'receive' && !!actions.receivingBox) ||
          (actions.confirmModal.action === 'start_session' && verification.loadingVerifBooks) ||
          (actions.confirmModal.action === 'send_to_cut' && !!actions.sendingToCut)
        }
        onCancel={actions.closeConfirm}
        onConfirm={() => {
          const box = actions.confirmModal.box
          if (!box) return
          actions.closeConfirm()
          if (actions.confirmModal.action === 'receive') actions.handleReceiveBox(box)
          else if (actions.confirmModal.action === 'start_session') verification.handleStartVerifSession(box.id)
          else if (actions.confirmModal.action === 'send_to_cut') actions.handleSendToCut(box)
        }}
      />
    </>
  )
}
