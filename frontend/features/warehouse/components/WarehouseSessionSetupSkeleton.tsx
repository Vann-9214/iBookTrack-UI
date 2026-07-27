'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function WarehouseSessionSetupSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-9 h-9 rounded-lg bg-primary/10 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-44 bg-muted-foreground/15" />
            <Skeleton className="h-3 w-56 bg-muted-foreground/10" />
          </div>
        </div>
        {/* Form skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex flex-col gap-1 w-full sm:flex-1">
            <Skeleton className="h-3 w-20 bg-muted-foreground/10" />
            <Skeleton className="h-9 w-full rounded-md bg-muted-foreground/10" />
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-[160px]">
            <Skeleton className="h-3 w-20 bg-muted-foreground/10" />
            <Skeleton className="h-9 w-full rounded-md bg-muted-foreground/10" />
          </div>
          <Skeleton className="h-9 w-full sm:w-32 rounded-md bg-primary/15" />
        </div>
      </div>
    </div>
  )
}
