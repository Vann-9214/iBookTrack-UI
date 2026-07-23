"use client"

import { cn } from "@/lib/utils"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { Inbox, Loader2 } from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"
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
    searchType,
    setSearchType,
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
      <div className={cn("flex h-screen bg-background font-sans", `theme-${brand}`)}>
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <DashboardNavbar />
          
          <main className="ambient-bg flex-1 overflow-auto flex flex-col p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
              <ScanHeader brand={brand} />

              <ScanSearch
                searchType={searchType}
                setSearchType={setSearchType}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />

              <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-px">
                <button
                  className={cn(
                    'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg border-primary text-primary bg-primary/5'
                  )}
                >
                  <Inbox className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Incoming</span>
                  <span className={cn(
                    'ml-1.5 px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary'
                  )}>{incomingBoxes.length}</span>
                </button>
                
                <div className="ml-auto">
                  <RefreshControl onRefresh={fetchBoxes} refreshing={loading} lastUpdated={lastUpdated} className="hidden sm:flex" />
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Loading boxes...</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <IncomingScanBoxList
                    boxes={incomingBoxes}
                    expandedBoxId={expandedBoxId}
                    boxBooks={boxBooks}
                    loadingBoxBooks={loadingBoxBooks}
                    receivingBox={receivingBox}
                    toggleBox={toggleBox}
                    openConfirm={openConfirm}
                  />
                </div>
              )}
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
