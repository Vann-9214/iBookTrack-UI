'use client'

import { useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import { useWarehouse } from '@/features/warehouse/hooks/useWarehouse'
import { WarehouseSessionSetup } from '@/features/warehouse/components/WarehouseSessionSetup'
import { WarehouseActiveSession } from '@/features/warehouse/components/WarehouseActiveSession'
import { WarehouseSessionStats } from '@/features/warehouse/components/WarehouseSessionStats'
import { WarehouseScanner } from '@/features/warehouse/components/WarehouseScanner'
import { WarehouseScanLog } from '@/features/warehouse/components/WarehouseScanLog'
import { WarehouseCompleteSessionModal } from '@/features/warehouse/components/WarehouseCompleteSessionModal'
import { WarehouseResetSessionModal } from '@/features/warehouse/components/WarehouseResetSessionModal'
import { WarehouseConflictModal } from '@/features/warehouse/components/WarehouseConflictModal'
import { WarehouseSimilarLotModal } from '@/features/warehouse/components/WarehouseSimilarLotModal'
import { WarehouseIlmsMismatchModal } from '@/features/warehouse/components/WarehouseIlmsMismatchModal'
import { WarehouseFlagModal } from '@/features/warehouse/components/WarehouseFlagModal'
import { WarehouseLotsOverview } from '@/features/warehouse/components/WarehouseLotsOverview'
import { MismatchDetailsModal } from '@/components/common/MismatchDetailsModal'
import { RefreshControl } from '@/components/refresh-control'
import { AlertTriangle, RefreshCw, Warehouse, X } from 'lucide-react'

export default function WarehousePage() {
  const { brand } = useBrand()
  const wh = useWarehouse()
  const [overviewLoading, setOverviewLoading] = useState(true)
  const unifiedLoading = wh.lotsLoading || overviewLoading

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-background', `theme-${brand}`)}>
      <DashboardSidebar navigationLocked={wh.sessionActive} />
      <main className="flex-1 flex flex-col overflow-hidden overflow-x-hidden">
        <DashboardNavbar disableBrandToggle={wh.sessionActive} navigationLocked={wh.sessionActive} />
        <div className={cn("ambient-bg flex-1 h-0 min-h-0", wh.sessionActive ? "overflow-y-auto sm:overflow-hidden" : "overflow-y-auto")}>
          <div className="flex flex-col gap-4 sm:gap-6 px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-4 lg:px-8 lg:pb-8 lg:pt-6 pb-safe-6">
            {/* Modals */}
            <WarehouseCompleteSessionModal
              confirmCompleteOpen={wh.confirmCompleteOpen}
              setConfirmCompleteOpen={wh.setConfirmCompleteOpen}
              totalBooksExpected={wh.totalBooksExpected}
              setTotalBooksExpected={wh.setTotalBooksExpected}
              issueIsbn={wh.issueIsbn}
              setIssueIsbn={wh.setIssueIsbn}
              issueType={wh.issueType}
              setIssueType={wh.setIssueType}
              issues={wh.issues}
              setIssues={wh.setIssues}
              fetchingIssueBook={wh.fetchingIssueBook}
              handleAddIssue={wh.handleAddIssue}
              handleRemoveIssue={wh.handleRemoveIssue}
              handleIssueKeyPress={wh.handleIssueKeyPress}
              currentSession={wh.currentSession}
              loading={wh.loading}
              confirmCloseSession={wh.confirmCloseSession}
            />
            <WarehouseResetSessionModal open={wh.confirmResetOpen} onClose={() => wh.setConfirmResetOpen(false)} onConfirm={wh.confirmResetSession} />
            <WarehouseConflictModal conflictModalState={wh.conflictModalState} setConflictModalState={wh.setConflictModalState} handleNewSession={wh.handleNewSession} />
            <WarehouseSimilarLotModal similarLotModal={wh.similarLotModal} setSimilarLotModal={wh.setSimilarLotModal} setActiveLot={wh.setActiveLot} />
            <WarehouseIlmsMismatchModal ilmsMismatchModal={wh.ilmsMismatchModal} setIlmsMismatchModal={wh.setIlmsMismatchModal} />
            <WarehouseFlagModal flagModalBook={wh.flagModalBook} setFlagModalBook={wh.setFlagModalBook} flagIssue={wh.flagIssue} setFlagIssue={wh.setFlagIssue} flagRemarks={wh.flagRemarks} setFlagRemarks={wh.setFlagRemarks} flagSaving={wh.flagSaving} flagOpen={wh.flagOpen} setFlagOpen={wh.setFlagOpen} saveFlagFromLog={wh.saveFlagFromLog} />
            <MismatchDetailsModal
              book={wh.mismatchModalBook}
              saving={wh.flagSaving}
              onClose={() => wh.setMismatchModalBook(null)}
              onSave={wh.saveMismatchFromLog}
            />

            {/* Error toast */}
            {(wh.sessionError || wh.lotsError) && (
              <div className="fixed top-10 right-6 z-50 flex items-start gap-3 max-w-md px-5 py-4 rounded-xl bg-destructive text-destructive-foreground text-base font-semibold shadow-lg animate-in fade-in slide-in-from-right-4">
                <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
                <span className="leading-snug flex-1">{wh.sessionError || wh.lotsError}</span>
                <button type="button" onClick={() => { wh.setSessionError(null); wh.setLotsError(null) }} className="p-1.5 rounded-md hover:bg-destructive-foreground/20 transition-colors" aria-label="Dismiss warning">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {!wh.sessionActive ? (
              <>
                {/* Page Header — matching Dashboard pattern */}
                <header className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={cn(
                      'p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0',
                      'bg-primary'
                    )}>
                      <Warehouse className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">Warehouse Receiving</h1>
                          <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground leading-snug">
                            Manage incoming lots and scanning sessions for{' '}
                            <span className={cn(
                              'inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
                              'bg-primary'
                            )}>
                              {brand}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={wh.handleRefreshStats}
                            disabled={wh.refreshingStats || wh.lotsLoading}
                            className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition disabled:opacity-50"
                            aria-label="Refresh"
                          >
                            <RefreshCw className={cn('h-4 w-4', (wh.refreshingStats || wh.lotsLoading) && 'animate-spin')} />
                          </button>
                          <RefreshControl
                            onRefresh={wh.handleRefreshStats}
                            refreshing={wh.refreshingStats || wh.lotsLoading}
                            lastUpdated={wh.lastStatsUpdate}
                            storageKey="warehouse"
                            className="hidden sm:flex"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </header>

                {/* Session Setup Card */}
                <div className="hidden sm:block">
                  <WarehouseSessionSetup brand={brand} lots={wh.lots} lotsLoading={unifiedLoading} activeLot={wh.activeLot} setActiveLot={wh.setActiveLot} selectedBox={wh.selectedBox} setSelectedBox={wh.setSelectedBox} loading={wh.loading} handleNewSession={wh.handleNewSession} boxInputRef={wh.boxInputRef} setSessionError={wh.setSessionError} boxLockedBy={wh.boxLockedBy} />
                </div>

                {/* Lots Overview Table */}
                <WarehouseLotsOverview brand={brand} refreshKey={wh.lockedWarehouseBoxes} refreshTrigger={wh.refreshingStats} unifiedLoading={unifiedLoading} setOverviewLoading={setOverviewLoading} />
              </>
            ) : (
              <WarehouseActiveSession brand={brand} activeLot={wh.activeLot} currentBoxNumber={wh.currentBoxNumber} currentBoxBooks={wh.currentBoxBooks} userName={wh.userName} loading={wh.loading} isbnLoading={wh.isbnLoading} scannedBooks={wh.scannedBooks} currentSession={wh.currentSession!} handleResetSession={wh.handleResetSession} handleCloseSession={wh.handleCloseSession}>
                <WarehouseSessionStats currentSession={wh.currentSession!} />
                <WarehouseScanner onScan={wh.handleScan} />
                <WarehouseScanLog scannedBooks={wh.scannedBooks} openFlagModal={wh.openFlagModal} openMismatchModal={wh.openMismatchModal} handleRemoveBook={wh.handleRemoveBook} brand={brand} />
              </WarehouseActiveSession>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
