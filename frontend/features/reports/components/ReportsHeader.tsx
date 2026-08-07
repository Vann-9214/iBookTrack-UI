import React from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { RefreshControl } from '@/components/refresh-control'
import { cn } from '@/lib/utils'
import { LotStatusRow } from '../types/reports.types'
import { ReportsExportButton } from './ReportsExportButton'

interface ReportsHeaderProps {
  brand: string
  timestamp: string
  lastUpdated: Date | null
  loading: boolean
  onRefresh: () => void
  lots: LotStatusRow[]
}

export const ReportsHeader: React.FC<ReportsHeaderProps> = ({
  brand,
  timestamp,
  lastUpdated,
  loading,
  onRefresh,
  lots,
}) => {
  return (
    <header className="relative z-10 shrink-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between flex-wrap">
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
          <div
            className={cn(
              'p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5 shrink-0',
              'bg-primary'
            )}
          >
            <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 flex-1 sm:pr-[140px] lg:pr-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">
                  LOT Status Report
                </h1>
                <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground leading-snug">
                  Real-time movement and completion status of all lots for{' '}
                  <span
                    className={cn(
                      'inline-block align-middle ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-white shadow-sm leading-none',
                      'bg-primary'
                    )}
                  >
                    {brand}
                  </span>
                  {timestamp && (
                    <span className="hidden sm:block lg:inline lg:ml-2 mt-1 sm:mt-1.5 lg:mt-0 text-xs font-medium text-muted-foreground/80">
                      <span className="hidden lg:inline">· </span>Updated {timestamp}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="flex items-center justify-center w-8 h-8 sm:hidden rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex absolute top-0 right-0 lg:relative lg:top-auto lg:right-auto items-center gap-2">
          <ReportsExportButton brand={brand} lots={lots} disabled={loading} />
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={loading}
            lastUpdated={lastUpdated}
            storageKey="reports"
          />
        </div>
      </div>
    </header>
  )
}
