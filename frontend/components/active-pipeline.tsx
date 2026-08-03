"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Workflow } from "lucide-react"

import { formatPipelineCounts } from "@/features/dashboard/utils/dashboard.helpers"

function getStepStatus(step: any) {
  if (step.displayText === "0") return "idle"
  const effectiveCount = step.active !== undefined ? Number(step.active) : Number(step.count)
  if (effectiveCount === 0 || isNaN(effectiveCount)) return "idle"
  return "active"
}

const getBrandColor = (brand: string, type: 'nodeRing' | 'nodeFill' | 'count' | 'bar' | 'cardBg' | 'dot') => {
  if (brand === 'jaguar') {
    return {
      nodeRing: 'border-emerald-400 text-emerald-500',
      nodeFill: 'bg-emerald-600 border-transparent text-white shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400/20',
      count: 'text-emerald-600',
      bar: 'bg-emerald-400',
      cardBg: 'bg-emerald-50 border-emerald-200/70 ring-1 ring-emerald-100/50 shadow-sm shadow-emerald-500/5',
      dot: 'bg-emerald-500',
    }[type]
  }
  return {
    nodeRing: 'border-blue-400 text-blue-500',
    nodeFill: 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/20',
    count: 'text-blue-600',
    bar: 'bg-blue-400',
    cardBg: 'bg-blue-50 border-blue-200/70 ring-1 ring-blue-100/50 shadow-sm shadow-blue-500/5',
    dot: 'bg-blue-500',
  }[type]
}

const getStatusConfig = (brand: string, active: number) => ({
  active: {
    nodeRing: getBrandColor(brand, 'nodeRing'),
    nodeFill: getBrandColor(brand, 'nodeFill'),
    countColor: active > 0 ? getBrandColor(brand, 'count') : 'text-slate-400',
    bar: getBrandColor(brand, 'bar'),
    cardBg: getBrandColor(brand, 'cardBg'),
    dot: getBrandColor(brand, 'dot'),
    label: "Active",
  },
  idle: {
    nodeRing: "border-slate-300/80 text-slate-400",
    nodeFill: "bg-gradient-to-br from-slate-100 to-slate-200/80 border-slate-300/60 text-slate-400 shadow-sm ring-1 ring-slate-200/40",
    countColor: "text-slate-400",
    bar: "bg-gradient-to-r from-slate-300/70 via-slate-200/40 to-transparent",
    cardBg: "bg-gradient-to-b from-slate-50/90 via-white/70 to-slate-100/50 border-slate-200/60 ring-1 ring-slate-100/40 shadow-sm",
    dot: "bg-slate-400",
    label: "Idle",
  },
})

interface ActivePipelineProps {
  currentLot?: string
  stats?: any
  brand?: 'mustang' | 'jaguar'
  loading?: boolean
}

export function ActivePipeline({ currentLot = "", stats, brand = 'mustang', loading = false }: ActivePipelineProps) {
  const borderColor = brand === 'jaguar' ? 'border-t-green-500' : 'border-t-blue-600'
  const todayLabel = stats?.pipelineToday
    ? `Today · ${new Date(stats.pipelineToday).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Today'

  const stageData = (stage: string) => {
    const raw = stats?.pipelineStages?.[stage]
    if (raw && typeof raw === 'object') {
      const fallbackReceived = stage === 'warehouse' ? (raw.received ?? raw.total ?? raw.active ?? 0) : (raw.received ?? raw.active ?? raw.total ?? 0)
      const received = fallbackReceived
      const completed = raw.completed
      const sent = raw.sent
      const formattedText = formatPipelineCounts({ received, completed, sent, type: stage }) || String(received || 0)
      return {
        count: raw.total || 0,
        active: raw.active || 0,
        received,
        completed,
        sent,
        displayText: formattedText,
        delayed: raw.delayed || 0,
        mustang: raw.mustang || 0,
        jaguar: raw.jaguar || 0,
        isBookStage: false,
      }
    }
    const val = typeof raw === 'number' ? raw : 0
    const formattedText = formatPipelineCounts({ received: val, type: stage }) || String(val)
    return { count: val, active: val, received: val, completed: undefined, sent: undefined, displayText: formattedText, delayed: 0, mustang: 0, jaguar: 0, isBookStage: false }
  }

  const getBadgeStyles = (type: 'received' | 'completed' | 'sent' | 'default', brandName: string, isZero: boolean) => {
    if (isZero) {
      return 'bg-slate-100/80 text-slate-500 border-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/80'
    }
    if (type === 'received' || type === 'default') {
      return brandName === 'jaguar'
        ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 shadow-xs'
        : 'bg-blue-100/80 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80 shadow-xs'
    }
    if (type === 'completed') {
      return 'bg-emerald-100/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 shadow-xs'
    }
    if (type === 'sent') {
      return 'bg-purple-100/80 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/80 shadow-xs'
    }
    return 'bg-slate-100/80 text-slate-500 border-slate-200/80'
  }

  const renderFormattedCounts = (step: any, defaultColorClass: string, brandName: string) => {
    const normType = step.stage.toLowerCase()
    const parts: { label: string; value: number; type: 'received' | 'completed' | 'sent' }[] = []

    if (step.received && step.received > 0) {
      parts.push({ label: 'Received', value: step.received, type: 'received' })
    }
    if ((normType === 'inventory' || normType === 'endorsement') && step.completed && step.completed > 0) {
      parts.push({ label: 'Completed', value: step.completed, type: 'completed' })
    }
    if ((normType === 'inventory' || normType === 'endorsement' || normType === 'cut') && step.sent && step.sent > 0) {
      parts.push({ label: 'Sent', value: step.sent, type: 'sent' })
    }

    if (parts.length === 0) {
      const val = Number(step.displayText)
      const isZero = isNaN(val) || val === 0
      const style = getBadgeStyles('default', brandName, isZero)
      return (
        <span className={cn(
          "inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded-lg border text-sm font-extrabold leading-tight tabular-nums transition-all my-0.5",
          style
        )}>
          {step.displayText}
        </span>
      )
    }

    return (
      <div className="flex flex-wrap items-center justify-center gap-2 my-0.5">
        {parts.map((p, idx) => {
          const style = getBadgeStyles(p.type, brandName, false)
          return (
            <span
              key={idx}
              className={cn(
                "inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-md border text-xs sm:text-sm font-extrabold leading-tight tabular-nums transition-all",
                style
              )}
              title={`${p.label}: ${p.value}`}
            >
              {p.value}
            </span>
          )
        })}
      </div>
    )
  }

  const pipelineSteps = [
    { label: "Warehouse",   ...stageData('warehouse'),   stage: "warehouse",   clickable: false },
    { label: "Inventory",   ...stageData('inventory'),   stage: "inventory",   clickable: false },
    { label: "Cut",         ...stageData('cut'),         stage: "cut",         clickable: false },
    { label: "Endorsement", ...stageData('endorsement'), stage: "endorsement", clickable: false },
    { label: "Scan",        ...stageData('scan'),        stage: "scan",        clickable: false },
    { label: "Transmit",    ...stageData('transmit'),    stage: "transmit",    isBookStage: true, clickable: false },
    { label: "Storage",     ...stageData('storage'),     stage: "storage",     clickable: false },
  ]

  if (loading || !stats) {
    return (
      <Card className={cn("relative rounded-2xl border-2 shadow-sm ring-1 overflow-hidden", brand === 'jaguar' ? "border-emerald-200/80 bg-emerald-50 ring-emerald-100/70" : "border-blue-200/80 bg-blue-50 ring-blue-100/70")}>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl z-0" />
        <CardHeader className="pb-4">
          <CardTitle className="relative z-10 flex flex-nowrap sm:flex-wrap items-center gap-x-3 gap-y-2 text-card-foreground">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn("flex shrink-0 h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm", brand === 'jaguar' ? "bg-emerald-600" : "bg-blue-600")}>
                <Workflow className="h-4 w-4" />
              </span>
              <span className="text-lg font-bold tracking-tight">Active Pipeline</span>
              <Skeleton className="h-4 w-12 rounded bg-muted-foreground/10" />
            </div>
            <Skeleton className="ml-auto h-6 w-24 rounded-full bg-muted-foreground/10" />
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="hidden lg:flex items-start gap-3">
            {pipelineSteps.map((step, i) => {
              const cfg = getStatusConfig(brand || 'mustang', 0)["idle"]
              return (
                <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-0 rounded-xl">
                  {/* Step number circle */}
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold mb-2", cfg.nodeFill)}>
                    {i + 1}
                  </div>
                  {/* Card body */}
                  <div className={cn("relative overflow-hidden w-full rounded-xl border px-3 pt-3 pb-2 flex flex-col items-center gap-1", cfg.cardBg)}>
                    <div className="pointer-events-none absolute inset-x-0 -top-6 h-12 bg-white/20 blur-lg" />
                    <span className="relative text-xs font-bold text-slate-500 uppercase tracking-wider">{step.label}</span>
                    <Skeleton className="relative h-7 w-8 rounded-lg bg-muted-foreground/10 my-0.5" />
                    <div className={cn("relative h-[3px] w-full rounded-full my-1", cfg.bar)} />
                    <div className="relative flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      <span className="text-[11px] font-semibold text-slate-400">{cfg.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="hidden lg:flex items-center gap-2 mt-5">
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/60 px-3 py-1.5 shadow-sm">
              <span className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-offset-1", brand === 'jaguar' ? "bg-emerald-500 ring-emerald-200" : "bg-blue-500 ring-blue-200")} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Received</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/60 px-3 py-1.5 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 ring-offset-1" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/60 px-3 py-1.5 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500 ring-2 ring-purple-200 ring-offset-1" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sent</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:hidden">
            {pipelineSteps.map((step, i) => {
              const cfg = getStatusConfig(brand || 'mustang', 0)["idle"]
              return (
                <div key={i} className={cn("relative overflow-hidden flex items-center gap-3 rounded-xl border p-2.5", cfg.cardBg)}>
                  <div className="pointer-events-none absolute inset-x-0 -top-4 h-8 bg-white/20 blur-md" />
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold", cfg.nodeFill)}>
                    {i + 1}
                  </div>
                  <div className="relative flex flex-col text-left gap-1">
                    <span className="text-sm font-bold text-slate-600">{step.label}</span>
                    <Skeleton className="h-3 w-16 rounded-lg bg-muted-foreground/10" />
                  </div>
                  <div className="relative ml-auto flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    <span className="text-[11px] font-semibold text-slate-400">{cfg.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn("relative rounded-2xl border-2 shadow-sm ring-1 overflow-hidden", brand === 'jaguar' ? "border-emerald-200/80 bg-emerald-50 ring-emerald-100/70" : "border-blue-200/80 bg-blue-50 ring-blue-100/70")}>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl z-0" />
        <CardHeader className="pb-4">
          <CardTitle className="relative z-10 flex flex-nowrap sm:flex-wrap items-center gap-x-3 gap-y-2 text-card-foreground">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn("flex shrink-0 h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm", brand === 'jaguar' ? "bg-emerald-600" : "bg-blue-600")}>
                <Workflow className="h-4 w-4" />
              </span>
              <span className="text-lg font-bold tracking-tight">Active Pipeline</span>
              {currentLot && <span className="text-sm font-medium text-muted-foreground truncate inline-block max-w-full">| {currentLot}</span>}
            </div>
            <span className={cn("ml-auto text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-white shadow-sm whitespace-nowrap", brand === 'jaguar' ? "bg-emerald-600" : "bg-blue-600")}>
              <span className="sm:hidden">Today</span>
              <span className="hidden sm:inline">{todayLabel}</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          {/* Desktop: card layout */}
          <div className="hidden lg:flex items-start gap-3">
            {pipelineSteps.map((step, i) => {
              const status = getStepStatus(step)
              const cfg = getStatusConfig(brand, step.active)[status]
              const inner = (
                <>
                  {/* Step number circle */}
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold mb-2 transition-all duration-300 group-hover/step:scale-110 group-hover/step:shadow-lg", cfg.nodeFill)}>
                    {i + 1}
                  </div>
                  {/* Card body */}
                  <div className={cn("relative overflow-hidden w-full rounded-xl border px-3 pt-3 pb-2 flex flex-col items-center gap-1 transition-all duration-300 group-hover/step:shadow-lg group-hover/step:-translate-y-1", cfg.cardBg)}>
                    <div className="pointer-events-none absolute inset-x-0 -top-6 h-12 bg-white/25 blur-lg" />
                    <span className="relative text-xs font-bold text-slate-500 uppercase tracking-wider">{step.label}</span>
                    <div className="relative">{renderFormattedCounts(step, cfg.countColor, brand)}</div>
                    <div className={cn("relative h-[3px] w-full rounded-full my-1", cfg.bar)} />
                    <div className="relative flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      <span className="text-[11px] font-semibold text-slate-400">{cfg.label}</span>
                    </div>
                  </div>
                </>
              )
              return (
                <div
                  key={step.label}
                  className="group/step flex-1 min-w-0 flex flex-col items-center gap-0 rounded-xl"
                >
                  {inner}
                </div>
              )
            })}
          </div>



          {/* Mobile: vertical */}
          <div className="flex flex-col gap-3 lg:hidden">
            {pipelineSteps.map((step, i) => {
              const status = getStepStatus(step)
              const cfg = getStatusConfig(brand, step.active)[status]
              const inner = (
                <>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200", cfg.nodeFill)}>
                    {i + 1}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-card-foreground">{step.label}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {renderFormattedCounts(step, cfg.countColor, brand)}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    <span className="text-xs font-semibold text-slate-400">{cfg.label}</span>
                  </div>
                </>
              )
              return (
                <div key={step.label} className={cn("relative overflow-hidden flex items-center gap-3 rounded-xl border p-2.5 transition-all duration-200 active:scale-[0.98]", cfg.cardBg)}>
                  <div className="pointer-events-none absolute inset-x-0 -top-4 h-8 bg-white/20 blur-md" />
                  {inner}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-nowrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2 mt-5">
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/60 px-2 py-1 sm:px-3 sm:py-1.5 shadow-sm">
              <span className={cn("h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 rounded-full ring-2 ring-offset-1", brand === 'jaguar' ? "bg-emerald-500 ring-emerald-200" : "bg-blue-500 ring-blue-200")} />
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Received</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/60 px-2 py-1 sm:px-3 sm:py-1.5 shadow-sm">
              <span className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 ring-offset-1" />
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/60 px-2 py-1 sm:px-3 sm:py-1.5 shadow-sm">
              <span className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 rounded-full bg-purple-500 ring-2 ring-purple-200 ring-offset-1" />
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Sent</span>
            </div>
          </div>
        </CardContent>
      </Card>


    </>
  )
}
