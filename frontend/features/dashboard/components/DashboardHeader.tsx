import { LayoutDashboard, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RefreshControl } from '@/components/refresh-control'
import { cn } from '@/lib/utils'

export function DashboardHeader({ brand, refreshing, lastUpdated, onRefresh, onOpenSearch }: { brand: 'mustang' | 'jaguar'; refreshing: boolean; lastUpdated: Date | null; onRefresh: () => void; onOpenSearch: () => void }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={cn('p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0', brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
          <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">Command Center</h1>
              <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                Overview of operations for
                <span className={cn('inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none', brand === 'jaguar' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600')}>
                  {brand}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button onClick={onRefresh} disabled={refreshing} className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all disabled:opacity-50" aria-label="Refresh Dashboard">
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
              <Button variant="default" size="sm" onClick={onOpenSearch} className="hidden sm:inline-flex gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shrink-0">
                <Search className="h-3.5 w-3.5" /> Search
              </Button>
              <RefreshControl onRefresh={onRefresh} refreshing={refreshing} lastUpdated={lastUpdated} storageKey="dashboard" className="hidden sm:flex" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
