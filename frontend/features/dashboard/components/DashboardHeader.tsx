import { LayoutDashboard, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RefreshControl } from '@/components/refresh-control'
import { cn } from '@/lib/utils'

export function DashboardHeader({ brand, refreshing, lastUpdated, onRefresh, onOpenSearch }: { brand: 'mustang' | 'jaguar'; refreshing: boolean; lastUpdated: Date | null; onRefresh: () => void; onOpenSearch: () => void }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0 premium-gradient-ui-card--solid">
          <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">Control Hub</h1>
              <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground leading-snug">
                Overview of operations for{' '}
                <span className="inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none premium-gradient-ui-card--solid">
                  {brand}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <Button variant="default" size="sm" onClick={onOpenSearch} className="hidden sm:inline-flex gap-1.5 premium-gradient-ui-card--solid rounded-lg shadow-md shrink-0">
                <Search className="h-3.5 w-3.5" /> Search
              </Button>
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition disabled:opacity-50"
                aria-label="Refresh"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
              <RefreshControl onRefresh={onRefresh} refreshing={refreshing} lastUpdated={lastUpdated} storageKey="dashboard" className="hidden sm:flex" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
