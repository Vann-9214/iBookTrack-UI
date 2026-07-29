import { CheckCircle } from 'lucide-react'
import { RefreshControl } from '@/components/refresh-control'
import type { Brand } from '@/hooks/use-brand'

interface EndorsementHeaderProps {
  brand: Brand
  refreshing?: boolean
  onRefresh?: () => void
  lastUpdated?: Date | null
}

export function EndorsementHeader({ brand, refreshing, onRefresh, lastUpdated }: EndorsementHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 premium-gradient-ui-card--solid">
          <CheckCircle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
            Book Inspection
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
            Receive boxes from Cut, inspect books, then send to Scan for{' '}
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none premium-gradient-ui-card--solid">
              {brand}
            </span>
          </p>
        </div>
      </div>
      {onRefresh && <RefreshControl onRefresh={onRefresh} refreshing={refreshing ?? false} lastUpdated={lastUpdated ?? null} storageKey="endorsement" />}
    </div>
  )
}
