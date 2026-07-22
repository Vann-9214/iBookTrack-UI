'use client'

import { RefreshControl } from '@/components/refresh-control'
import { Skeleton } from '@/components/ui/skeleton'

interface WarehouseHeaderProps {
  lastStatsUpdate: Date | null
  refreshingStats: boolean
  lotsLoading: boolean
  handleRefreshStats: () => Promise<void> | void
}

export function WarehouseHeader({ lastStatsUpdate, refreshingStats, lotsLoading, handleRefreshStats }: WarehouseHeaderProps) {
  return lotsLoading ? (
    <div className="flex items-center justify-end">
      <Skeleton className="h-9 w-28 bg-muted-foreground/20" />
    </div>
  ) : (
    <header className="flex items-center justify-end">
      <RefreshControl
        onRefresh={handleRefreshStats}
        refreshing={refreshingStats || lotsLoading}
        lastUpdated={lastStatsUpdate}
        storageKey="warehouse"
        className="hidden sm:flex"
      />
    </header>
  )
}
