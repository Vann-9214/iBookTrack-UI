"use client"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
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

export default function BookInspectionPage() {
  const isMobile = useIsMobile()

  const {
    brand,
    colors,
    activeTab,
    setActiveTab,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
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
    handleResetInspSession,
    handleOpenInspComplete,
    handleCompleteInspSession,
  } = useInspectionSession(filteredInspection, () => {
    fetchEndorsementBoxes()
    setActiveTab('outgoing')
  })

  return (
    <>
      <div className={cn("flex h-screen bg-background font-sans", `theme-${brand}`)}>
        <DashboardSidebar navigationLocked={inspSessionActive} />
        <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
          <DashboardNavbar disableBrandToggle={inspSessionActive} navigationLocked={inspSessionActive} />
          <main className="ambient-bg flex-1 overflow-auto flex flex-col p-4 md:p-6 lg:p-8">
            <div className={cn("mx-auto w-full flex-1 flex flex-col", inspSessionActive ? "max-w-full" : "max-w-6xl")}>
              {/* Header */}
              <EndorsementHeader brand={brand} />

              {/* Search bar */}
              {!inspSessionActive && (
                <EndorsementSearch
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchType={searchType}
                  setSearchType={setSearchType}
                />
              )}

              {/* Tab Navigation */}
              <EndorsementTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                inspSessionActive={inspSessionActive}
                incomingCount={filteredIncoming.length}
                inspectionCount={filteredInspection.length}
                outgoingCount={filteredOutgoing.length}
                colors={colors}
                onRefresh={refreshAll}
                refreshing={loadingIncoming || loadingEndorsement}
                lastUpdated={lastUpdated}
              />

              {/* TAB: INCOMING BOXES */}
              {activeTab === 'incoming' && (
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

              {/* TAB: ENDORSEMENT / INSPECTION */}
              {activeTab === 'inspection' && (
                <div className="flex flex-col gap-4">
                  <CompleteInspectionModal
                    inspConfirmComplete={inspConfirmComplete}
                    inspScannedBooks={inspScannedBooks}
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

                  {!inspSessionActive ? (
                    <InspectionBoxList
                      loadingEndorsement={loadingEndorsement}
                      filteredInspection={filteredInspection}
                      inspExpandedBoxId={inspExpandedBoxId}
                      inspRowBooks={inspRowBooks}
                      loadingInspRowBooks={loadingInspRowBooks}
                      isMobile={isMobile}
                      loadingInspSession={loadingInspSession}
                      toggleInspRow={toggleInspRow}
                      openConfirm={openConfirm}
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
                        handleRemoveInspBook={handleRemoveInspBook}
                      />
                    )
                  )}
                </div>
              )}

              {/* TAB: OUTGOING BOXES */}
              {activeTab === 'outgoing' && (
                <OutgoingBoxes
                  filteredOutgoing={filteredOutgoing}
                  expandedBoxId={expandedBoxId}
                  boxBooks={boxBooks}
                  loadingBoxBooks={loadingBoxBooks}
                  sendingToScan={sendingToScan}
                  toggleBox={toggleBox}
                  openConfirm={openConfirm}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Action Confirmation Modal */}
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
