'use client'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'

import { useNonProcessable } from '@/features/non-processable/hooks/useNonProcessable'
import { NonProcessableHeader } from '@/features/non-processable/components/NonProcessableHeader'
import { NonProcessableKPIs } from '@/features/non-processable/components/NonProcessableKPIs'
import { NonProcessableCharts } from '@/features/non-processable/components/NonProcessableCharts'
import { NonProcessableList } from '@/features/non-processable/components/NonProcessableList'
import { NonProcessableModals } from '@/features/non-processable/components/NonProcessableModals'

export default function NonProcessablePage() {
  const { brand } = useBrand()
  const isJaguar = brand === 'jaguar'

  const {
    totalCount,
    issueBreakdown,
    timelineData,
    searchQuery, setSearchQuery,
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    selectedWeek, setSelectedWeek,
    resolvingId,
    structuredLots,
    loading,
    sessionResolvedFlags,
    flagToResolve, setFlagToResolve,
    selectedCategory, setSelectedCategory,
    lastUpdated,
    fetchCounts,
    resolveFlag,
    filteredLots,

    displayFlags,
  } = useNonProcessable(brand)

  return (
    <div className={cn('flex h-screen bg-background font-sans', `theme-${brand}`)}>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardNavbar />
        <main className="ambient-bg flex-1 flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="flex flex-col min-h-0 gap-6 pb-8">
            <NonProcessableHeader
              brand={brand}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedWeek={selectedWeek}
              setSelectedWeek={setSelectedWeek}

              loading={loading}
              lastUpdated={lastUpdated}
              fetchCounts={fetchCounts}
            />

            <NonProcessableKPIs
              totalCount={totalCount}
              issueBreakdown={issueBreakdown}
              resolvedCount={sessionResolvedFlags.length}
              loading={loading}
              setSelectedCategory={setSelectedCategory}
              isJaguar={isJaguar}
            />

            <NonProcessableCharts
              timelineData={timelineData}
              structuredLots={structuredLots}
              loading={loading}
              isJaguar={isJaguar}
            />

            <NonProcessableList
              filteredLots={filteredLots}
              totalCount={totalCount}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              loading={loading}
              resolvingId={resolvingId}
              handleResolveClick={setFlagToResolve}
              isJaguar={isJaguar}
              brand={brand}
            />
            
            <div className="h-4 shrink-0"></div>
          </div>
        </main>
      </div>

      <NonProcessableModals
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        displayFlags={displayFlags}
        loading={loading}
        isJaguar={isJaguar}
        flagToResolve={flagToResolve}
        setFlagToResolve={setFlagToResolve}
        resolveFlag={resolveFlag}
        resolvingId={resolvingId}
      />
    </div>
  )
}
