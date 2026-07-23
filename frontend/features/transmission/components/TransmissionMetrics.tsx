'use client'

import { Activity, CheckCircle2, FileUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransmissionBrand } from '../types/transmission.types'
import type { LiveSummary } from '../types/transmission.types'

interface TransmissionMetricsProps {
  brand: TransmissionBrand
  loading: boolean
  totalTransmitted: number
  passRate: string
  ongoingTransmissions: number
  failedTransmissions: number
  summary: LiveSummary | null
}

export function TransmissionMetrics({
  brand,
  loading,
  totalTransmitted,
  passRate,
  ongoingTransmissions,
  failedTransmissions,
  summary,
}: TransmissionMetricsProps) {
  return (
    <>
      {/* Mobile */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        <div
          className={cn(
            'rounded-2xl border p-2.5 flex flex-col items-center justify-center shadow-sm active:scale-[0.97] transition-all text-center',
            brand === 'jaguar'
              ? 'border-emerald-300 bg-emerald-100/60'
              : 'border-blue-300 bg-blue-100/60'
          )}
        >
          <div
            className={cn(
              'text-lg font-black leading-none',
              brand === 'jaguar' ? 'text-emerald-600' : 'text-blue-600'
            )}
          >
            {loading ? '…' : totalTransmitted.toLocaleString()}
          </div>
          <div className="text-[10px] font-medium text-gray-500 mt-0.5 leading-tight">Transmitted</div>
        </div>
        <div className="rounded-2xl border border-green-300 bg-green-100/60 p-2.5 flex flex-col items-center justify-center shadow-sm active:scale-[0.97] transition-all text-center">
          <div className="text-lg font-black leading-none text-green-600">{loading ? '…' : `${passRate}%`}</div>
          <div className="text-[10px] font-medium text-gray-500 mt-0.5 leading-tight">Pass</div>
        </div>
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border p-2.5 flex flex-col items-center justify-center shadow-sm ring-1 active:scale-[0.97] transition-all text-center',
            brand === 'jaguar'
              ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-600/40 ring-emerald-300/30 text-white'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-600/40 ring-blue-300/30 text-white'
          )}
        >
          <div className="relative text-lg font-black leading-none text-white">
            {loading ? '…' : (summary?.TotalScans || 0).toLocaleString()}
          </div>
          <div className="relative text-[10px] font-medium text-white/90 mt-0.5 leading-tight">Total</div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-3 gap-4">
        <div
          className={cn(
            'rounded-2xl border p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]',
            brand === 'jaguar'
              ? 'border-emerald-300 bg-emerald-100/60 hover:bg-emerald-100'
              : 'border-blue-300 bg-blue-100/60 hover:bg-blue-100'
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm',
                brand === 'jaguar' ? 'bg-emerald-500' : 'bg-blue-500'
              )}
            >
              <FileUp className="h-6 w-6" />
            </div>
            {ongoingTransmissions > 0 && (
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  brand === 'jaguar' ? 'text-emerald-600' : 'text-blue-600'
                )}
              >
                {ongoingTransmissions} in progress
              </span>
            )}
          </div>
          <div
            className={cn(
              'text-3xl font-black mb-0.5',
              brand === 'jaguar' ? 'text-emerald-600' : 'text-blue-600'
            )}
          >
            {loading ? '…' : totalTransmitted.toLocaleString()}
          </div>
          <div className="text-sm font-semibold text-gray-700 mb-0.5">Transmitted Today</div>
          <div className={cn('text-xs', brand === 'jaguar' ? 'text-emerald-500' : 'text-blue-500')}>
            books sent to archive
          </div>
        </div>
        <div className="rounded-2xl border border-green-300 bg-green-100/60 hover:bg-green-100 p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 text-white shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            {failedTransmissions > 0 && (
              <span className="text-[11px] font-semibold text-red-500">{failedTransmissions} failed</span>
            )}
          </div>
          <div className="text-3xl font-black text-green-600 mb-0.5">{loading ? '…' : `${passRate}%`}</div>
          <div className="text-sm font-semibold text-gray-700 mb-0.5">Pass Rate</div>
          <div className="text-xs text-green-500">transmission success rate</div>
        </div>
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
            brand === 'jaguar'
              ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-600/40 ring-emerald-300/30 text-white hover:shadow-emerald-500/40'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-600/40 ring-blue-300/30 text-white hover:shadow-blue-500/40'
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
          <div className="relative flex items-start justify-between mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-black/10 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
              <Activity className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-semibold text-white/80">{summary?.Ongoing || 0} ongoing</span>
          </div>
          <div className="relative text-4xl font-black mb-0.5 tracking-tight tabular-nums text-white">
            {loading ? '…' : (summary?.TotalScans || 0).toLocaleString()}
          </div>
          <div className="relative text-sm font-semibold mb-0.5 text-white/90">Total Books Today</div>
          <div className="relative text-xs font-medium text-white/70">all successful scans this session</div>
        </div>
      </div>
    </>
  )
}
