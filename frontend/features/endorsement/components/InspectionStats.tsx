import { ScanBarcode, CircleCheck, CircleX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InspSession } from '../types/endorsement.types'

interface InspectionStatsProps {
  inspCurrentSession: InspSession | null
}

export function InspectionStats({ inspCurrentSession }: InspectionStatsProps) {
  const stats = [
    {
      label: 'Total scanned',
      value: inspCurrentSession?.total_scanned_books || 0,
      icon: ScanBarcode,
      card: 'bg-white/68 border border-primary/15 ring-1 ring-primary/10 hover:shadow-primary/20',
      iconBg: 'premium-gradient-ui-card--solid',
      text: 'text-primary',
      accent: 'bg-primary/20',
    },
    {
      label: 'Processable',
      value: inspCurrentSession?.total_processable || 0,
      icon: CircleCheck,
      card: 'border-emerald-200/80 bg-emerald-50 ring-emerald-100/70 hover:shadow-emerald-200/60',
      iconBg: 'bg-emerald-600 shadow-emerald-500/25',
      text: 'text-emerald-700',
      accent: 'bg-emerald-400/20',
    },
    {
      label: 'Non-processable',
      value: inspCurrentSession?.total_non_processable || 0,
      icon: CircleX,
      card: 'border-rose-200/80 bg-red-50 ring-rose-100/70 hover:shadow-rose-200/60',
      iconBg: 'bg-red-600 shadow-red-500/25',
      text: 'text-red-600',
      accent: 'bg-red-400/20',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map(({ label, value, icon: Icon, card, iconBg, text, accent }) => (
        <div key={label} className={cn('relative min-w-0 overflow-hidden rounded-2xl border p-2 shadow-sm ring-1 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-3', card)}>
          <div className={cn('absolute -right-5 -top-5 h-20 w-20 rounded-full blur-xl', accent)} />
          <div className="relative flex h-full items-center justify-between gap-3">
            <div className={cn('hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg sm:flex', iconBg)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="ml-auto min-w-0 text-right">
              <p className={cn('truncate text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px]', text)}>{label}</p>
              <p className={cn('mt-0.5 text-2xl font-black leading-none tracking-tight sm:text-3xl', text)}>{value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
