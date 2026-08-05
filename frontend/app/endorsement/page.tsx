"use client"

import { Boxes } from 'lucide-react'
import { cn } from "@/lib/utils"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { useEndorsement, useInspectionSession } from "@/features/endorsement/hooks"
import {
  EndorsementHeader,
  EndorsementSearch,
  EndorsementTabs,
  IncomingBoxes,
  InspectionBoxList,
  InspectionSession,
  OutgoingBoxes,
  InspectionFlagModal,
  CompleteInspectionModal,
  EndorsementActionConfirmModal,
} from "@/features/endorsement/components"
import { MismatchDetailsModal } from "@/components/common/MismatchDetailsModal"

export default function BookInspectionPage() {
  const {
    brand,
    activeTab,
    setActiveTab,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    filteredIncoming,
    filteredInspection,
    filteredOutgoing,
    loadingIncoming,
    loadingEndorsement,
    receivingBox,
    sendingToScan,
    expandedBoxId,
    boxBooks,
    loadingBoxBooks,
    toggleBox,
    inspExpandedBoxId,
    inspRowBooks,
    loadingInspRowBooks,
    toggleInspRow,
    confirmModal,
    openConfirm,
    closeConfirm,
    handleReceiveBox,
    handleSendToScan,
    refreshAll,
    fetchEndorsementBoxes,
  } = useEndorsement()

  const {
    inspSessionActive,
    inspBox,
    inspUserName,
    inspUserId,
    inspCurrentSession,
    inspScannedBooks,
    inspCurrentBoxBooks,
    loadingInspSession,
    inspConfirmComplete,
    setInspConfirmComplete,
    inspFlagModalBook,
    inspFlagIssue,
    setInspFlagIssue,
    inspFlagRemarks,
    setInspFlagRemarks,
    inspFlagSaving,
    warehouseBooks,
    loadingWarehouseBooks,
    handleStartInspSession,
    handleInspScan,
    handleRemoveInspBook,
    openInspFlagModal,
    closeInspFlagModal,
    saveInspFlagFromLog,
    inspMismatchModalBook,
    openInspMismatchModal,
    closeInspMismatchModal,
    saveInspMismatchFromLog,
    handleResetInspSession,
    handleOpenInspComplete,
    handleCompleteInspSession,
  } = useInspectionSession(filteredInspection, () => {
    fetchEndorsementBoxes()
    setActiveTab('outgoing')
  })

  return (
    <>
      <div className={cn("flex h-screen bg-background font-sans print:hidden", `theme-${brand}`)}>
        <DashboardSidebar navigationLocked={inspSessionActive} />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <DashboardNavbar disableBrandToggle={inspSessionActive} navigationLocked={inspSessionActive} />
          <main className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 pb-safe-6">
              <EndorsementHeader
                brand={brand}
                refreshing={loadingIncoming || loadingEndorsement}
                onRefresh={refreshAll}
                lastUpdated={lastUpdated}
              />

              {!inspSessionActive && (
                <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl p-4 sm:p-5">
                  <div className="premium-gradient-ui-card__glow" />
                  <div className="relative flex items-center gap-3 mb-4">
                    <div className="premium-gradient-ui-card__icon w-8 h-8">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="premium-gradient-ui-card__eyebrow">Receive · Inspect · Send</p>
                      <h2 className="text-[15px] font-black tracking-tight text-foreground leading-none">Manage Book Inspection</h2>
                    </div>
                  </div>
                  <EndorsementSearch
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />
                  <EndorsementTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    inspSessionActive={inspSessionActive}
                    incomingCount={filteredIncoming.length}
                    inspectionCount={filteredInspection.length}
                    outgoingCount={filteredOutgoing.length}
                  />
                </div>
              )}

              {!inspSessionActive && activeTab === 'incoming' && (
                <IncomingBoxes
                  loadingIncoming={loadingIncoming}
                  filteredIncoming={filteredIncoming}
                  expandedBoxId={expandedBoxId}
                  boxBooks={boxBooks}
                  loadingBoxBooks={loadingBoxBooks}
                  receivingBox={receivingBox}
                  toggleBox={toggleBox}
                  openConfirm={openConfirm}
                />
              )}

              {activeTab === 'inspection' && (
                <div className="flex flex-col gap-4 sm:gap-6">
                  <CompleteInspectionModal
                    inspConfirmComplete={inspConfirmComplete}
                    inspScannedBooks={inspScannedBooks}
                    warehouseBooks={warehouseBooks}
                    loadingInspSession={loadingInspSession}
                    onClose={() => setInspConfirmComplete(false)}
                    onConfirm={handleCompleteInspSession}
                  />

                  <InspectionFlagModal
                    inspFlagModalBook={inspFlagModalBook}
                    inspFlagIssue={inspFlagIssue}
                    setInspFlagIssue={setInspFlagIssue}
                    inspFlagRemarks={inspFlagRemarks}
                    setInspFlagRemarks={setInspFlagRemarks}
                    inspFlagSaving={inspFlagSaving}
                    onClose={closeInspFlagModal}
                    onSave={saveInspFlagFromLog}
                  />

                  <MismatchDetailsModal
                    book={inspMismatchModalBook}
                    saving={inspFlagSaving}
                    onClose={closeInspMismatchModal}
                    onSave={saveInspMismatchFromLog}
                  />

                  {!inspSessionActive ? (
                    <InspectionBoxList
                      loadingEndorsement={loadingEndorsement}
                      filteredInspection={filteredInspection}
                      inspExpandedBoxId={inspExpandedBoxId}
                      inspRowBooks={inspRowBooks}
                      loadingInspRowBooks={loadingInspRowBooks}
                      toggleInspRow={toggleInspRow}
                      openConfirm={openConfirm}
                      currentUserId={inspUserId}
                    />
                  ) : (
                    inspBox && (
                      <InspectionSession
                        inspBox={inspBox}
                        inspCurrentBoxBooks={inspCurrentBoxBooks}
                        inspUserName={inspUserName}
                        loadingInspSession={loadingInspSession}
                        inspScannedBooks={inspScannedBooks}
                        inspCurrentSession={inspCurrentSession}
                        warehouseBooks={warehouseBooks}
                        loadingWarehouseBooks={loadingWarehouseBooks}
                        handleResetInspSession={handleResetInspSession}
                        handleOpenInspComplete={handleOpenInspComplete}
                        handleInspScan={handleInspScan}
                        openInspFlagModal={openInspFlagModal}
                        openInspMismatchModal={openInspMismatchModal}
                        handleRemoveInspBook={handleRemoveInspBook}
                        brand={brand}
                      />
                    )
                  )}
                </div>
              )}

              {!inspSessionActive && activeTab === 'outgoing' && (
                <OutgoingBoxes
                  filteredOutgoing={filteredOutgoing}
                  expandedBoxId={expandedBoxId}
                  boxBooks={boxBooks}
                  loadingBoxBooks={loadingBoxBooks}
                  sendingToScan={sendingToScan}
                  toggleBox={toggleBox}
                  openConfirm={openConfirm}
                  loadingEndorsement={loadingEndorsement}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      <EndorsementActionConfirmModal
        confirmModal={confirmModal}
        inspUserName={inspUserName}
        receivingBox={receivingBox}
        loadingInspSession={loadingInspSession}
        sendingToScan={sendingToScan}
        onClose={closeConfirm}
        onConfirm={() => {
          if (!confirmModal.box) return
          const box = confirmModal.box
          closeConfirm()
          if (confirmModal.action === 'receive') handleReceiveBox(box)
          else if (confirmModal.action === 'start_session') handleStartInspSession(box.id)
          else handleSendToScan(box)
        }}
      />
    </>
  )
}
