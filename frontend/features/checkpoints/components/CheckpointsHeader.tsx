import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RefreshControl } from '@/components/refresh-control'

interface CheckpointsHeaderProps {
  brand: string
  topLoading: boolean
  transitionsLoading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
}

export function CheckpointsHeader({
  brand,
  topLoading,
  transitionsLoading,
  lastUpdated,
  onRefresh,
}: CheckpointsHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5',
            brand === 'jaguar'
              ? 'bg-emerald-600'
              : 'bg-blue-600'
          )}
        >
          <MapPin className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
            Station Monitor
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
            Live pipeline tracking for{' '}
            <span
              className={cn(
                'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
                brand === 'jaguar'
                  ? 'bg-emerald-600'
                  : 'bg-blue-600'
              )}
            >
              {brand}
            </span>
          </p>
        </div>
      </div>
      <RefreshControl
        onRefresh={onRefresh}
        refreshing={topLoading || transitionsLoading}
        lastUpdated={lastUpdated}
        storageKey="checkpoints"
        className="hidden sm:flex"
      />
    </header>
  )
}
