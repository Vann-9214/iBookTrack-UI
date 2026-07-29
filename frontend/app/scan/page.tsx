"use client"

import { ScanBarcode, Boxes } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { useScan } from "@/features/scan/hooks"
import {
  ScanHeader,
  ScanSearch,
  IncomingScanBoxList,
  ScanReceiveConfirmModal,
} from "@/features/scan/components"

export default function ScanPage() {
  const {
    brand,
    userName,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    incomingBoxes,
    loading,
    receivingBox,
    confirmModal,
    openConfirm,
    closeConfirm,
    expandedBoxId,
    boxBooks,
    loadingBoxBooks,
    toggleBox,
    fetchBoxes,
    handleReceiveBox,
  } = useScan()

  return (
    <>
      <div className={cn("flex h-screen bg-background font-sans print:hidden", `theme-${brand}`)}>
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <DashboardNavbar />

          <main className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 pb-safe-6">
              <ScanHeader
                brand={brand}
                refreshing={loading}
                onRefresh={fetchBoxes}
                lastUpdated={lastUpdated}
              />

              <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl p-4 sm:p-5">
                <div className="premium-gradient-ui-card__glow" />
                <div className="relative flex items-center gap-3 mb-4">
                  <div className="premium-gradient-ui-card__icon w-8 h-8">
                    <ScanBarcode className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="premium-gradient-ui-card__eyebrow">Receive</p>
                    <h2 className="text-[15px] font-black tracking-tight text-foreground leading-none">Manage Book Scanning</h2>
                  </div>
                </div>

                <ScanSearch
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  loading={loading}
                />

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />

                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Incoming</span>
                  <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                    {incomingBoxes.length}
                  </span>
                </div>
              </div>

              <IncomingScanBoxList
                boxes={incomingBoxes}
                expandedBoxId={expandedBoxId}
                boxBooks={boxBooks}
                loadingBoxBooks={loadingBoxBooks}
                receivingBox={receivingBox}
                loading={loading}
                toggleBox={toggleBox}
                openConfirm={openConfirm}
              />
            </div>
          </main>
        </div>
      </div>

      <ScanReceiveConfirmModal
        open={confirmModal.open}
        box={confirmModal.box}
        userName={userName}
        receivingBox={receivingBox}
        onCancel={closeConfirm}
        onConfirm={(box) => {
          closeConfirm()
          handleReceiveBox(box)
        }}
      />
    </>
  )
}
