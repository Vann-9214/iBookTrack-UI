import React from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilterStatus } from '../types/reports.types'
import { STATUS_META } from '../utils/reports.helpers'

interface ReportStatusSummaryProps {
  brand: string
  filter: FilterStatus
  setFilter: (filter: FilterStatus) => void
  counts: Record<FilterStatus, number>
}

export const ReportStatusSummary: React.FC<ReportStatusSummaryProps> = ({
  brand,
  filter,
  setFilter,
  counts,
}) => {
  const isJaguar = brand === 'jaguar'
  const TONE = {
    theme: isJaguar
      ? {
          card: 'bg-emerald-50 border-2 border-emerald-200/80 ring-emerald-100/70',
          icon: 'bg-primary shadow-emerald-500/25',
          value: 'text-emerald-700',
          title: 'text-emerald-950/70',
          sub: 'text-primary/80',
          hover: 'hover:shadow-emerald-200/60',
          activeRing: 'ring-2 ring-primary/50 border-primary shadow-md',
        }
      : {
          card: 'bg-blue-50 border-2 border-blue-200/80 ring-blue-100/70',
          icon: 'bg-primary shadow-blue-500/25',
          value: 'text-blue-700',
          title: 'text-blue-950/70',
          sub: 'text-primary/80',
          hover: 'hover:shadow-blue-200/60',
          activeRing: 'ring-2 ring-primary/50 border-primary shadow-md',
        },
    emerald: {
      card: 'bg-emerald-50 border-2 border-emerald-200/80 ring-emerald-100/70',
      icon: 'bg-primary shadow-emerald-500/25',
      value: 'text-emerald-700',
      title: 'text-emerald-950/70',
      sub: 'text-primary/80',
      hover: 'hover:shadow-emerald-200/60',
      activeRing: 'ring-2 ring-primary/50 border-primary shadow-md',
    },
    amber: {
      card: 'bg-gradient-to-br from-amber-50 via-card to-orange-100/60 border-2 border-amber-200/80 ring-amber-100/70',
      icon: 'bg-amber-600 shadow-amber-500/25',
      value: 'text-amber-700',
      title: 'text-amber-950/70',
      sub: 'text-amber-600/80',
      hover: 'hover:shadow-amber-200/60',
      activeRing: 'ring-2 ring-amber-500/50 border-amber-400 shadow-md',
    },
    blue: {
      card: 'bg-blue-50 border-2 border-blue-200/80 ring-blue-100/70',
      icon: 'bg-primary shadow-blue-500/25',
      value: 'text-blue-700',
      title: 'text-blue-950/70',
      sub: 'text-primary/80',
      hover: 'hover:shadow-blue-200/60',
      activeRing: 'ring-2 ring-primary/50 border-primary shadow-md',
    },
    solid: isJaguar
      ? {
          card: 'bg-primary border-2 border-primary/40 ring-emerald-300/30 text-white',
          icon: 'bg-white/20 shadow-black/10',
          value: 'text-white',
          title: 'text-white/90',
          sub: 'text-white/70',
          hover: 'hover:shadow-emerald-500/40',
          activeRing: 'ring-2 ring-white/50 shadow-lg',
        }
      : {
          card: 'bg-primary border-2 border-primary/40 ring-blue-300/30 text-white',
          icon: 'bg-white/20 shadow-black/10',
          value: 'text-white',
          title: 'text-white/90',
          sub: 'text-white/70',
          hover: 'hover:shadow-blue-500/40',
          activeRing: 'ring-2 ring-white/50 shadow-lg',
        },
  } as const

  const cards = (['all', 'closed', 'open', 'in-progress'] as FilterStatus[]).map(s => {
    const meta = s === 'all' ? null : STATUS_META[s]
    const Icon = meta?.icon || Package
    const count = counts[s]
    const active = filter === s

    let tone
    if (s === 'all') tone = TONE.solid
    else if (s === 'closed') tone = TONE.emerald
    else if (s === 'open') tone = TONE.amber
    else if (s === 'in-progress') tone = TONE.blue
    else tone = TONE.theme

    return { s, Icon, count, active, tone }
  })

  return (
    <>
      {/* Mobile: compact 2×2 grid, matching dashboard KPI cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:hidden">
        {cards.map(({ s, Icon, count, active, tone }) => (
          <div
            key={s}
            onClick={() => setFilter(s)}
            role="button"
            className={cn(
              'rounded-2xl border p-3 flex items-center gap-2.5 shadow-sm ring-1 transition-all duration-200 active:scale-[0.97] overflow-hidden cursor-pointer',
              tone.card,
              active && tone.activeRing
            )}
          >
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md shrink-0', tone.icon)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn('text-lg font-black leading-none tracking-tight truncate', tone.value)}>{count}</div>
              <div className={cn('text-[11px] font-semibold truncate mt-1', tone.title)}>
                {s === 'all' ? 'All Lots' : STATUS_META[s].label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: full cards */}
      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(({ s, Icon, count, active, tone }) => (
          <div
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'group relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm ring-1 transition-all duration-300 cursor-pointer',
              tone.card,
              active ? tone.activeRing : cn('hover:-translate-y-1 hover:shadow-xl', tone.hover)
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
            <div className="relative flex items-start justify-between mb-3">
              <div
                className={cn(
                  'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300',
                  tone.icon,
                  !active && 'group-hover:scale-110'
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className={cn('text-3xl sm:text-4xl font-black mb-0.5 tracking-tight tabular-nums', tone.value)}>
                {count}
              </div>
            </div>
            <div className={cn('relative text-sm font-semibold mb-0.5 truncate', tone.title)}>
              {s === 'all' ? 'All Lots' : STATUS_META[s].label}
            </div>
            <div className={cn('relative text-xs font-medium truncate', tone.sub)}>
              {active ? 'Currently filtered' : 'Click to filter'}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
