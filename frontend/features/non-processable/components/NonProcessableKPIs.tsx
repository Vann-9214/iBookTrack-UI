import { cn } from '@/lib/utils'
import { AlertOctagon, FileWarning, PackageX, CheckCircle2, Loader2 } from 'lucide-react'
import { SelectedCategory } from '../types'
import { getTone } from '../utils/constants'

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
  const redTone = TONE.redSolid

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
      
      {/* Total Non-Processable (Always Red) */}
      <div onClick={() => setSelectedCategory('Total')} className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", redTone.card, redTone.hover)}>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
        <div className="relative flex items-start justify-between mb-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", redTone.icon)}>
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", redTone.value)}>
            {loading ? <Loader2 className="h-6 w-6 animate-spin mt-2" /> : totalCount.toLocaleString()}
          </div>
        </div>
        <div className={cn("relative text-sm font-semibold mb-0.5", redTone.title)}>Total Non-Processable</div>
        <div className={cn("relative text-xs font-medium", redTone.sub)}>Needs review</div>
      </div>

      {/* Physical Damage */}
      <div onClick={() => setSelectedCategory('Damage')} className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", dynamicTone.card, dynamicTone.hover)}>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
        <div className="relative flex items-start justify-between mb-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", dynamicTone.icon)}>
            <FileWarning className="h-6 w-6" />
          </div>
          <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", dynamicTone.value)}>
            {loading ? <Loader2 className="h-6 w-6 animate-spin mt-2 opacity-50" /> : issueBreakdown.damage.toLocaleString()}
          </div>
        </div>
        <div className={cn("relative text-sm font-semibold mb-0.5", dynamicTone.title)}>Physical Damage</div>
        <div className={cn("relative text-xs font-medium", dynamicTone.sub)}>Torn / Cut / Split</div>
      </div>

      {/* Inventory Mismatch */}
      <div onClick={() => setSelectedCategory('Mismatch')} className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", dynamicTone.card, dynamicTone.hover)}>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
        <div className="relative flex items-start justify-between mb-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", dynamicTone.icon)}>
            <PackageX className="h-6 w-6" />
          </div>
          <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", dynamicTone.value)}>
            {loading ? <Loader2 className="h-6 w-6 animate-spin mt-2 opacity-50" /> : issueBreakdown.mismatch.toLocaleString()}
          </div>
        </div>
        <div className={cn("relative text-sm font-semibold mb-0.5", dynamicTone.title)}>Inventory Mismatch</div>
        <div className={cn("relative text-xs font-medium", dynamicTone.sub)}>Missing or Extra</div>
      </div>

      {/* Resolved This Session */}
      <div onClick={() => setSelectedCategory('Resolved')} className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", dynamicTone.card, dynamicTone.hover)}>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
        <div className="relative flex items-start justify-between mb-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", dynamicTone.icon)}>
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", dynamicTone.value)}>
            {loading ? <Loader2 className="h-6 w-6 animate-spin mt-2 opacity-50" /> : resolvedCount.toLocaleString()}
          </div>
        </div>
        <div className={cn("relative text-sm font-semibold mb-0.5", dynamicTone.title)}>Resolved</div>
        <div className={cn("relative text-xs font-medium", dynamicTone.sub)}>Flags resolved</div>
      </div>

    </div>
  )
}
