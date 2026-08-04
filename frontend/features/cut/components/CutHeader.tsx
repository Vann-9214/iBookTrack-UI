import { Scissors, RefreshCw } from 'lucide-react'
import { RefreshControl } from '@/components/refresh-control'
import { cn } from '@/lib/utils'

interface CutHeaderProps {
  brand: string
  refreshing?: boolean
  onRefresh?: () => void
  lastUpdated?: Date | null
}

export function CutHeader({ brand, refreshing, onRefresh, lastUpdated }: CutHeaderProps) {
  return (
    <header className="relative z-10 shrink-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0 premium-gradient-ui-card--solid">
            <Scissors className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">
                  Cut Station
                </h1>
                <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground leading-snug">
                  Book cutting and spine removal for{' '}
                  <span className="inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none premium-gradient-ui-card--solid">
                    {brand}
                  </span>
                </p>
              </div>
              {onRefresh && (
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all disabled:opacity-50"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {onRefresh && (
          <div className="flex items-center justify-start sm:justify-end shrink-0">
            <RefreshControl
              onRefresh={onRefresh}
              refreshing={refreshing ?? false}
              lastUpdated={lastUpdated ?? null}
              storageKey="cut"
              className="hidden sm:flex"
            />
          </div>
        )}
      </div>
    </header>
  )
}
