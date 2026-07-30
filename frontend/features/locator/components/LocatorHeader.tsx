import React from "react"
import { StorageLocatorIcon } from "@/components/dashboard-sidebar"
import { RefreshControl } from "@/components/refresh-control"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"

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
          <span className={cn(
            "inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none",
            brand === 'jaguar'
              ? 'bg-emerald-600'
              : 'bg-blue-600'
          )}>
            {brand}
          </span>
        </>
      }
      icon={StorageLocatorIcon}
      rightContent={
        <RefreshControl onRefresh={refreshLocator} refreshing={isRefreshing} lastUpdated={lastUpdated} storageKey="locator" className="hidden sm:flex" />
      }
    />
  )
}
