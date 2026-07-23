'use client'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { cn } from '@/lib/utils'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { DashboardPipeline } from '@/features/dashboard/components/DashboardPipeline'
import { DashboardRecentActivity } from '@/features/dashboard/components/DashboardRecentActivity'
import { DashboardSearch } from '@/features/dashboard/components/DashboardSearch'
import { DashboardStats } from '@/features/dashboard/components/DashboardStats'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { DashboardMain } from './DashboardMain'

export default function DashboardPage() {
  const dashboard = useDashboard()

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-background', `theme-${dashboard.brand}`)}>
      <DashboardSidebar />
      <DashboardMain>
        <DashboardNavbar />
        <div className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 pb-safe-6">
            <DashboardHeader
              brand={dashboard.brand}
              refreshing={dashboard.isRefreshing}
              lastUpdated={dashboard.lastStatsUpdate}
              onRefresh={dashboard.refreshAll}
              onOpenSearch={() => dashboard.setSearchOpen(true)}
            />
            <DashboardSearch
              open={dashboard.searchOpen}
              type={dashboard.searchType}
              value={dashboard.searchValue}
              rangeStart={dashboard.rangeStart}
              rangeEnd={dashboard.rangeEnd}
              isRange={dashboard.isRange}
              result={dashboard.searchResult}
              loading={dashboard.loading}
              onOpenChange={dashboard.setSearchOpen}
              onTypeChange={dashboard.setSearchType}
              onValueChange={dashboard.setSearchValue}
              onRangeStartChange={dashboard.setRangeStart}
              onRangeEndChange={dashboard.setRangeEnd}
              onRangeChange={dashboard.setIsRange}
              onSearch={dashboard.handleSearch}
              onClear={dashboard.clearSearch}
            />
            <DashboardStats stats={dashboard.dashboardStats} refreshKey={dashboard.refreshKey} loading={dashboard.isRefreshing} />
            <DashboardPipeline currentLot={dashboard.displayText} stats={dashboard.dashboardStats} brand={dashboard.brand} loading={dashboard.isRefreshing} />
            <DashboardRecentActivity scans={dashboard.liveScans} loading={dashboard.isRefreshing} />
          </div>
        </div>
      </DashboardMain>
    </div>
  )
}

