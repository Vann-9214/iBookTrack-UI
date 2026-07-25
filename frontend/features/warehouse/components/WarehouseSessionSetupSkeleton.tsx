'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function WarehouseSessionSetupSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-11 h-11 rounded-xl bg-primary/10 shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48 bg-muted-foreground/15" />
            <Skeleton className="h-3.5 w-64 bg-muted-foreground/10" />
          </div>
        </div>
        {/* Form skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex flex-col gap-1.5 w-full sm:flex-1">
            <Skeleton className="h-3 w-20 bg-muted-foreground/10" />
            <Skeleton className="h-10 w-full rounded-md bg-muted-foreground/10" />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
            <Skeleton className="h-3 w-20 bg-muted-foreground/10" />
            <Skeleton className="h-10 w-full rounded-md bg-muted-foreground/10" />
          </div>
          <Skeleton className="h-10 w-full sm:w-36 rounded-md bg-primary/15" />
        </div>
      </div>
    </div>
  )
}
