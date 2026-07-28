'use client'

import { CircleCheck, CircleX, ScanBarcode } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/use-brand'
import type { WarehouseSession } from '../types/warehouse.types'

interface WarehouseSessionStatsProps {
  currentSession: WarehouseSession
}

export function WarehouseSessionStats({ currentSession }: WarehouseSessionStatsProps) {
  const { brand } = useBrand()
  const isJaguar = brand === 'jaguar'
  const stats = [
    {
      label: 'Total scanned',
      value: currentSession.total_scanned_books,
      icon: ScanBarcode,
      card: isJaguar
        ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-card to-emerald-100/70 ring-emerald-100/70 hover:shadow-emerald-200/60'
        : 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-card to-indigo-100/70 ring-blue-100/70 hover:shadow-blue-200/60',
      iconBg: isJaguar ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25',
      text: isJaguar ? 'text-emerald-700' : 'text-blue-700',
      accent: isJaguar ? 'bg-emerald-400/20' : 'bg-blue-400/20',
    },
    {
      label: 'Processable',
      value: currentSession.total_processable,
      icon: CircleCheck,
      card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-card to-green-100/70 ring-emerald-100/70 hover:shadow-emerald-200/60',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25',
      text: 'text-emerald-700',
      accent: 'bg-emerald-400/20',
    },
    {
      label: 'Non-processable',
      value: currentSession.total_non_processable,
      icon: CircleX,
      card: 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-card to-red-100/70 ring-rose-100/70 hover:shadow-rose-200/60',
      iconBg: 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/25',
      text: 'text-red-600',
      accent: 'bg-red-400/20',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {/* Mobile: centered col, no icon. Desktop: original — icon left, left-aligned text */}
      {stats.map(({ label, value, icon: Icon, card, iconBg, text, accent }) => (
        <div key={label} className={cn('relative min-w-0 overflow-hidden rounded-2xl border p-3 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-4', card)}>
          <div className={cn('absolute -right-5 -top-5 h-20 w-20 rounded-full blur-xl', accent)} />
          <div className="relative flex h-full items-center justify-between gap-3">
            <div className={cn('hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg sm:flex', iconBg)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="ml-auto min-w-0 text-right">
              <p className={cn('truncate text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px]', text)}>{label}</p>
              <p className={cn('mt-1 text-3xl font-black leading-none tracking-tight sm:text-4xl', text)}>{value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
