import { MapPin, RefreshCw } from 'lucide-react'
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
    <header className="relative z-10 shrink-0 mb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
          <div
            className={cn(
              'p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0',
              brand === 'jaguar'
                ? 'bg-emerald-600'
                : 'bg-blue-600'
            )}
          >
            <MapPin className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">
                  Station Monitor
                </h1>
                <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground leading-snug">
                  Live pipeline tracking for{' '}
                  <span
                    className={cn(
                      'inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
                      brand === 'jaguar'
                        ? 'bg-emerald-600'
                        : 'bg-blue-600'
                    )}
                  >
                    {brand}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={onRefresh}
                  disabled={topLoading || transitionsLoading}
                  className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw className={cn('h-4 w-4', (topLoading || transitionsLoading) && 'animate-spin')} />
                </button>
                <RefreshControl
                  onRefresh={onRefresh}
                  refreshing={topLoading || transitionsLoading}
                  lastUpdated={lastUpdated}
                  storageKey="checkpoints"
                  className="hidden sm:flex"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
