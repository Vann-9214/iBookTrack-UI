import { cn } from '@/lib/utils'
import { AlertOctagon, FileWarning, PackageX, CheckCircle2 } from 'lucide-react'
import { SelectedCategory } from '../types'
import { getTone } from '../utils/constants'
import { Skeleton } from '@/components/ui/skeleton'

interface NonProcessableKPIsProps {
  totalCount: number
  issueBreakdown: { damage: number; mismatch: number }
  resolvedCount: number
  loading: boolean
  setSelectedCategory: (cat: SelectedCategory) => void
  isJaguar: boolean
}

export function NonProcessableKPIs({
  totalCount,
  issueBreakdown,
  resolvedCount,
  loading,
  setSelectedCategory,
  isJaguar
}: NonProcessableKPIsProps) {
  const TONE = getTone(isJaguar)
  const dynamicTone = TONE.theme
  const redTone = TONE.red

  const stats = [
    {
      title: "Total Non-Processable",
      value: totalCount.toLocaleString(),
      subtext: "Needs review",
      icon: AlertOctagon,
      tone: redTone,
      onClick: () => setSelectedCategory('Total'),
      isSolid: true
    },
    {
      title: "Physical Damage",
      value: issueBreakdown.damage.toLocaleString(),
      subtext: "Torn / Cut / Split",
      icon: FileWarning,
      tone: dynamicTone,
      onClick: () => setSelectedCategory('Damage'),
      isSolid: false
    },
    {
      title: "Inventory Mismatch",
      value: issueBreakdown.mismatch.toLocaleString(),
      subtext: "Missing or Extra",
      icon: PackageX,
      tone: dynamicTone,
      onClick: () => setSelectedCategory('Mismatch'),
      isSolid: false
    },
    {
      title: "Resolved",
      value: resolvedCount.toLocaleString(),
      subtext: "Flags resolved",
      icon: CheckCircle2,
      tone: dynamicTone,
      onClick: () => setSelectedCategory('Resolved'),
      isSolid: false
    }
  ]

  return (
    <>
      {loading ? (
        <>
          {/* Mobile 2x2 skeleton */}
          <div className="grid grid-cols-2 gap-2.5 sm:hidden shrink-0">
            {stats.map((stat, i) => {
              const skColor = stat.isSolid ? "bg-white/25" : "bg-muted-foreground/20"
              return (
                <div key={i} className={cn("rounded-2xl border p-3 flex flex-col gap-2 shadow-sm ring-1 overflow-hidden", stat.tone.card)}>
                  <div className="flex items-start justify-between w-full">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-[10px] shadow-md shrink-0", stat.tone.icon)}>
                      <Skeleton className={cn("h-4 w-4 rounded-sm", stat.isSolid ? "bg-white/30" : "bg-white/50")} />
                    </div>
                    <Skeleton className={cn("h-5 w-12 rounded mt-0.5", skColor)} />
                  </div>
                  <div className="min-w-0 w-full">
                    <Skeleton className={cn("h-3 w-16 rounded", skColor)} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden sm:grid grid-cols-2 gap-4 xl:grid-cols-4 shrink-0">
            {stats.map((stat, i) => {
              const skColor = stat.isSolid ? "bg-white/30" : "bg-muted-foreground/15"
              return (
                <div key={i} className={cn("relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1", stat.tone.card)}>
                  <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
                  <div className="relative flex items-start justify-between mb-3">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg", stat.tone.icon)}>
                      <Skeleton className={cn("h-6 w-6 rounded-md", stat.isSolid ? "bg-white/30" : "bg-white/50")} />
                    </div>
                    <Skeleton className={cn("h-8 w-20 rounded-md", skColor)} />
                  </div>
                  <Skeleton className={cn("h-4 w-28 mb-2 rounded relative z-10", skColor)} />
                  <Skeleton className={cn("h-3 w-20 rounded relative z-10", skColor)} />
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {/* ── Mobile: compact 2×2 grid ── */}
          <div className="grid grid-cols-2 gap-2.5 sm:hidden shrink-0">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className={cn(
                  "rounded-2xl border p-3 flex flex-col gap-2 shadow-sm ring-1 overflow-hidden",
                  stat.tone.card
                )}
              >
                <div className="flex items-start justify-between w-full">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-[10px] text-white shadow-md shrink-0", stat.tone.icon)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div className={cn("text-xl font-black leading-none tracking-tight truncate tabular-nums", stat.tone.value)}>{stat.value}</div>
                </div>
                <div className="flex flex-col min-w-0 mt-auto">
                  <div className={cn("text-[11px] font-semibold truncate leading-tight", stat.tone.title)}>{stat.title}</div>
                  <div className={cn("text-[9px] font-medium truncate opacity-90", stat.tone.sub)}>{stat.subtext}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop: full cards ── */}
          <div className="hidden sm:grid grid-cols-2 gap-4 xl:grid-cols-4 shrink-0">
            {stats.map((stat) => (
              <button
                key={stat.title}
                onClick={stat.onClick}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 text-left w-full cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  stat.tone.card
                )}
              >
                <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
                <div className="relative flex items-start justify-between mb-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", stat.tone.icon)}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", stat.tone.value)}>{stat.value}</div>
                </div>
                <div className={cn("relative text-sm font-semibold mb-0.5", stat.tone.title)}>{stat.title}</div>
                <div className={cn("relative text-xs font-medium", stat.tone.sub)}>{stat.subtext}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
