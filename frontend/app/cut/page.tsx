"use client"

import { Scissors } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBrand } from "@/hooks/use-brand"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from "@/components/top-bar"
import { RefreshControl } from "@/components/refresh-control"

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
    lastUpdated,
    loading,
    isRefreshing,
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
      <div className={cn('flex h-screen bg-background font-sans print:hidden', `theme-${brand}`)}>
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <DashboardNavbar />

          <main className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 pb-safe-6">
              <CutHeader
                brand={brand}
                refreshing={isRefreshing}
                onRefresh={() => fetchBoxes()}
                lastUpdated={lastUpdated}
              />

              <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl p-4 sm:p-5">
                <div className="premium-gradient-ui-card__glow" />
                <div className="relative flex items-center gap-3 mb-4">
                  <div className="premium-gradient-ui-card__icon w-8 h-8">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="premium-gradient-ui-card__eyebrow">Receive · Send</p>
                    <h2 className="text-[15px] font-black tracking-tight text-foreground leading-none">Manage Box Cutting</h2>
                  </div>
                </div>

                <CutSearch
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  loading={loading}
                />

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <CutTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    incomingCount={filteredIncoming.length}
                    outgoingCount={filteredOutgoing.length}
                  />
                </div>
              </div>

              {activeTab === 'incoming' && (
                <IncomingCutBoxList
                  boxes={filteredIncoming}
                  expandedBoxId={expandedBoxId}
                  onToggleBox={toggleBox}
                  onActionClick={openConfirm}
                  receivingBoxId={receivingBox}
                  boxBooks={boxBooks}
                  loadingBoxBooksId={loadingBoxBooks}
                  loading={loading}
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
                  loading={loading}
                />
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
