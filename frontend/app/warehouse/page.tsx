'use client'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import { useWarehouse } from '@/features/warehouse/hooks/useWarehouse'
import { WarehouseHeader } from '@/features/warehouse/components/WarehouseHeader'
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
import { AlertTriangle, X } from 'lucide-react'

export default function WarehousePage() {
  const { brand } = useBrand()
  const wh = useWarehouse()

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-background', `theme-${brand}`)}>
      <DashboardSidebar navigationLocked={wh.sessionActive} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar disableBrandToggle={wh.sessionActive} navigationLocked={wh.sessionActive} />
        <div className="ambient-bg flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
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

          {!wh.sessionActive && (
            <WarehouseHeader lastStatsUpdate={wh.lastStatsUpdate} refreshingStats={wh.refreshingStats} lotsLoading={wh.lotsLoading} handleRefreshStats={wh.handleRefreshStats} />
          )}

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
            <WarehouseSessionSetup brand={brand} lots={wh.lots} lotsLoading={wh.lotsLoading} activeLot={wh.activeLot} setActiveLot={wh.setActiveLot} selectedBox={wh.selectedBox} setSelectedBox={wh.setSelectedBox} loading={wh.loading} handleNewSession={wh.handleNewSession} boxInputRef={wh.boxInputRef} setSessionError={wh.setSessionError} />
          ) : (
            <WarehouseActiveSession brand={brand} activeLot={wh.activeLot} currentBoxNumber={wh.currentBoxNumber} currentBoxBooks={wh.currentBoxBooks} userName={wh.userName} loading={wh.loading} isbnLoading={wh.isbnLoading} scannedBooks={wh.scannedBooks} currentSession={wh.currentSession!} handleResetSession={wh.handleResetSession} handleCloseSession={wh.handleCloseSession}>
              <WarehouseSessionStats currentSession={wh.currentSession!} />
              <WarehouseScanner onScan={wh.handleScan} />
              <WarehouseScanLog scannedBooks={wh.scannedBooks} openFlagModal={wh.openFlagModal} handleRemoveBook={wh.handleRemoveBook} />
            </WarehouseActiveSession>
          )}
        </div>
      </main>
    </div>
  )
}
