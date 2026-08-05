import React from "react"
import { StorageLocatorIcon } from "@/components/dashboard-sidebar"
import { RefreshControl } from "@/components/refresh-control"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"

interface LocatorHeaderProps {
  brand: string
  refreshLocator: () => Promise<void>
  isRefreshing: boolean
  lastUpdated: Date | null
}

export const LocatorHeader: React.FC<LocatorHeaderProps> = ({
  brand,
  refreshLocator,
  isRefreshing,
  lastUpdated
}) => {
  return (
    <PageHeader
      title="Storage Locator"
      subtitle={
        <>
          Find the physical location of any box for{' '}
          <span className="premium-gradient-ui-card--solid inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider shadow-sm leading-none">
            {brand}
          </span>
        </>
      }
      icon={StorageLocatorIcon}
      mobileRightContent={
        <button
          onClick={refreshLocator}
          disabled={isRefreshing}
          className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </button>
      }
      rightContent={
        <RefreshControl onRefresh={refreshLocator} refreshing={isRefreshing} lastUpdated={lastUpdated} storageKey="locator" className="hidden sm:flex" />
      }
    />
  )
}
