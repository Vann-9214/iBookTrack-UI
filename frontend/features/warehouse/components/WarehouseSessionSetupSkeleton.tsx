'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function WarehouseSessionSetupSkeleton() {
  return (
    <div className="flex flex-col items-center w-full max-w-2xl">
      <div className="mb-8 text-center space-y-2">
        <Skeleton className="h-8 w-56 bg-muted-foreground/20" />
        <Skeleton className="h-4 w-72 bg-muted-foreground/20" />
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-lg shadow-black/5 ring-1 ring-black/5 w-full overflow-hidden relative">
        <Skeleton className="absolute top-0 left-0 right-0 h-1 rounded-none bg-primary/20" />
        <div className="p-8 md:p-10 space-y-6">
          <div className="flex items-center gap-5 mb-2">
            <Skeleton className="w-14 h-14 rounded-2xl bg-primary/10" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48 bg-muted-foreground/20" />
              <Skeleton className="h-4 w-3/4 max-w-sm bg-muted-foreground/20" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-xl bg-muted/30 border border-border">
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-4 w-24 bg-muted-foreground/20" />
              <Skeleton className="h-11 w-full rounded-lg bg-muted-foreground/20" />
            </div>
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-4 w-24 bg-muted-foreground/20" />
              <Skeleton className="h-11 w-full rounded-lg bg-muted-foreground/20" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-lg bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  )
}
