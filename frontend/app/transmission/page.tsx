'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import { useMachineBooks, useTransmission, useTransmissionLot } from '@/features/transmission/hooks'
import {
  RankingModal,
  TransmissionFilters,
  TransmissionFlagModal,
  TransmissionHeader,
  TransmissionMetrics,
  TransmissionStageBreakdown,
  TransmissionTabs,
} from '@/features/transmission/components'

export default function TransmissionMonitorPage() {
  const { brand } = useBrand()
  const t = useTransmission()
  const m = useMachineBooks({ fromDate: t.fromDate, toDate: t.toDate, brand, newProcessOnly: t.newProcessOnly })
  const l = useTransmissionLot(brand)

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-background', `theme-${brand}`)}>
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
            <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <TransmissionHeader 
                brand={brand} 
                mobileRightContent={
                  <button
                    onClick={() => t.fetchLiveData()}
                    disabled={t.loading}
                    className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all disabled:opacity-50"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={cn('h-4 w-4', t.loading && 'animate-spin')} />
                  </button>
                }
              />

              <TransmissionFilters
                brand={brand}
                fromDate={t.fromDate}
                setFromDate={t.setFromDate}
                toDate={t.toDate}
                setToDate={t.setToDate}
                fromDateOpenMobile={t.fromDateOpenMobile}
                setFromDateOpenMobile={t.setFromDateOpenMobile}
                toDateOpenMobile={t.toDateOpenMobile}
                setToDateOpenMobile={t.setToDateOpenMobile}
                fromDateOpenDesktop={t.fromDateOpenDesktop}
                setFromDateOpenDesktop={t.setFromDateOpenDesktop}
                toDateOpenDesktop={t.toDateOpenDesktop}
                setToDateOpenDesktop={t.setToDateOpenDesktop}
                newProcessOnly={t.newProcessOnly}
                setNewProcessOnly={t.setNewProcessOnly}
                exporting={t.exporting}
                handleExport={t.handleExport}
                handleOpenRanking={t.handleOpenRanking}
                loading={t.loading}
                lastUpdated={t.lastUpdated}
                fetchLiveData={t.fetchLiveData}
              />
            </header>

            {t.limitReached && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-center gap-3 mb-2 shadow-sm animate-in fade-in zoom-in duration-300">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p>
                  <strong>Data limit reached!</strong> The system fetched the maximum 50,000 status updates and stopped
                  to prevent crashing. Some older books from this date range may be hidden. If you need a complete
                  history, please narrow your date range or use Export.
                </p>
              </div>
            )}

            <TransmissionMetrics
              brand={brand}
              loading={t.loading}
              totalTransmitted={t.totalTransmitted}
              passRate={t.passRate}
              ongoingTransmissions={t.ongoingTransmissions}
              failedTransmissions={t.failedTransmissions}
              summary={t.summary}
            />

            <TransmissionStageBreakdown
              stages={t.stages}
              stageFilter={t.stageFilter}
              setStageFilter={t.setStageFilter}
            />

            <TransmissionTabs brand={brand} transmission={t} machine={m} lot={l} />
          </div>
        </div>
      </main>

      <RankingModal
        showRanking={t.showRanking}
        setShowRanking={t.setShowRanking}
        ranking={t.ranking}
        rankingLoading={t.rankingLoading}
      />

      {l.flagModalScan && (
        <TransmissionFlagModal
          flagModalScan={l.flagModalScan}
          setFlagModalScan={l.setFlagModalScan}
          flagIssue={l.flagIssue}
          setFlagIssue={l.setFlagIssue}
          flagRemarks={l.flagRemarks}
          setFlagRemarks={l.setFlagRemarks}
          flagging={l.flagging}
          flagError={l.flagError}
          flagOpen={l.flagOpen}
          setFlagOpen={l.setFlagOpen}
          handleFlagSubmit={l.handleFlagSubmit}
        />
      )}
    </div>
  )
}
