"use client"

import { cn } from "@/lib/utils"
import { useBrand } from "@/hooks/use-brand"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from "@/components/top-bar"
import { Loader2 } from "lucide-react"

import { useCut } from "@/features/cut/hooks"
import {
  CutHeader,
  CutSearch,
  CutTabs,
  IncomingCutBoxList,
  CutWorkQueue,
  CutActionConfirmModal,
} from "@/features/cut/components"

export default function CutPage() {
  const { brand } = useBrand()

  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    lastUpdated,
    loading,
    receivingBox,
    sendingBox,
    userName,
    confirmModal,
    openConfirm,
    closeConfirm,
    expandedBoxId,
    boxBooks,
    loadingBoxBooks,
    toggleBox,
    fetchBoxes,
    handleReceiveBox,
    handleSendBox,
    filteredIncoming,
    filteredOutgoing,
  } = useCut(brand)

  return (
    <>
      <div className={cn("flex h-screen bg-background font-sans", `theme-${brand}`)}>
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <DashboardNavbar />
          
          <main className="ambient-bg flex-1 overflow-auto flex flex-col p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
              <CutHeader brand={brand} />

              <CutSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchType={searchType}
                setSearchType={setSearchType}
              />

              <CutTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                incomingCount={filteredIncoming.length}
                outgoingCount={filteredOutgoing.length}
                onRefresh={fetchBoxes}
                refreshing={loading}
                lastUpdated={lastUpdated}
              />

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Loading boxes...</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {activeTab === 'incoming' && (
                    <IncomingCutBoxList
                      boxes={filteredIncoming}
                      expandedBoxId={expandedBoxId}
                      onToggleBox={toggleBox}
                      onActionClick={openConfirm}
                      receivingBoxId={receivingBox}
                      boxBooks={boxBooks}
                      loadingBoxBooksId={loadingBoxBooks}
                    />
                  )}
                  
                  {activeTab === 'outgoing' && (
                    <CutWorkQueue
                      boxes={filteredOutgoing}
                      expandedBoxId={expandedBoxId}
                      onToggleBox={toggleBox}
                      onActionClick={openConfirm}
                      sendingBoxId={sendingBox}
                      boxBooks={boxBooks}
                      loadingBoxBooksId={loadingBoxBooks}
                    />
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <CutActionConfirmModal
        confirmModal={confirmModal}
        userName={userName}
        receivingBox={receivingBox}
        sendingBox={sendingBox}
        onClose={closeConfirm}
        onConfirmReceive={() => {
          if (confirmModal.box) handleReceiveBox(confirmModal.box)
        }}
        onConfirmSend={() => {
          if (confirmModal.box) handleSendBox(confirmModal.box)
        }}
      />
    </>
  )
}
