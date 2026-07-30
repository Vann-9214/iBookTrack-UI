import React from 'react'
import { BarChart3 } from 'lucide-react'
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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-wrap">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5',
            brand === 'jaguar'
              ? 'bg-emerald-600'
              : 'bg-blue-600'
          )}
        >
          <BarChart3 className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
            LOT Status Report
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
            Real-time movement and completion status of all lots for{' '}
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
            {timestamp && <span className="ml-2 hidden sm:inline">· Updated {timestamp}</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ReportsExportButton brand={brand} lots={lots} disabled={loading} />
        <RefreshControl
          onRefresh={onRefresh}
          refreshing={loading}
          lastUpdated={lastUpdated}
          storageKey="reports"
          className="hidden sm:flex"
        />
      </div>
    </header>
  )
}
