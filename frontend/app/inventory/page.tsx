'use client'

import { useCallback } from 'react'
import { Boxes } from 'lucide-react'
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
  const { brand } = useBrand()
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
          <main className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 pb-safe-6">
              <InventoryHeader
                brand={brand}
                refreshing={inventory.loadingBoxes || actions.isManualRefreshing}
                onRefresh={actions.handleManualRefresh}
                lastUpdated={inventory.lastInventoryUpdate}
              />
              <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl p-4 sm:p-5">
                <div className="premium-gradient-ui-card__glow" />
                <div className="relative flex items-center gap-3 mb-4">
                  <div className="premium-gradient-ui-card__icon w-8 h-8">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="premium-gradient-ui-card__eyebrow">Receive · Verify · Send</p>
                    <h2 className="text-[15px] font-black tracking-tight text-foreground leading-none">Manage Box Movement</h2>
                  </div>
                </div>
                {!verification.verifSessionActive && (
                  <>
                    <InventorySearchBar
                      searchQuery={inventory.searchQuery}
                      onQueryChange={inventory.setSearchQuery}
                      loading={inventory.loadingBoxes}
                    />
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />
                  </>
                )}
                <InventoryTabNavigation
                  tab={actions.inventoryTab}
                  onTabChange={actions.setInventoryTab}
                  counts={{ incoming: actions.incomingBoxes.length, verification: actions.inventoryBoxes.length, outgoing: actions.outgoingBoxes.length }}
                  disabled={verification.verifSessionActive}
                />
              </div>
              {actions.inventoryTab === 'incoming' && <InventoryIncomingTab inventory={inventory} actions={actions} />}
              {actions.inventoryTab === 'verification' && <InventoryVerificationTab brand={brand} inventory={inventory} actions={actions} verification={verification} />}
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
