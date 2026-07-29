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
      nodeRing: 'border-green-400 text-green-500',
      nodeFill: 'bg-gradient-to-br from-emerald-500 to-green-600 border-transparent text-white shadow-md shadow-emerald-500/25',
      count: 'text-green-600',
      bar: 'bg-gradient-to-r from-green-400 via-green-400/50 to-transparent',
      cardBg: 'bg-gradient-to-b from-green-50 to-green-100/30 border-green-200/60',
      dot: 'bg-green-500',
    }[type]
  }
  return {
    nodeRing: 'border-blue-400 text-blue-500',
    nodeFill: 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent text-white shadow-md shadow-blue-500/25',
    count: 'text-blue-600',
    bar: 'bg-gradient-to-r from-blue-400 via-blue-400/50 to-transparent',
    cardBg: 'bg-gradient-to-b from-blue-50 to-indigo-100/30 border-blue-200/60',
    dot: 'bg-blue-500',
  }[type]
}

const getStatusConfig = (brand: string, active: number) => ({
  active: {
    nodeRing: getBrandColor(brand, 'nodeRing'),
    nodeFill: getBrandColor(brand, 'nodeFill'),
    countColor: active > 0 ? getBrandColor(brand, 'count') : 'text-gray-400',
    bar: getBrandColor(brand, 'bar'),
    cardBg: getBrandColor(brand, 'cardBg'),
    dot: getBrandColor(brand, 'dot'),
    label: "Active",
  },
  idle: {
    nodeRing: "border-gray-300 text-gray-400",
    nodeFill: "bg-white border-gray-300 text-gray-400",
    countColor: "text-gray-400",
    bar: "bg-gradient-to-r from-gray-300 via-gray-300/50 to-transparent",
    cardBg: "bg-gray-50/80 border-gray-200/70",
    dot: "bg-gray-400",
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
      <Card className={cn("relative rounded-2xl border-2 shadow-sm ring-1 overflow-hidden", brand === 'jaguar' ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-card to-emerald-100/60 ring-emerald-100/70" : "border-blue-200/80 bg-gradient-to-br from-blue-50 via-card to-indigo-100/60 ring-blue-100/70")}>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl z-0" />
        <CardHeader className="pb-4">
          <CardTitle className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-card-foreground">
            <div className="flex items-center gap-2.5">
              <span className={cn("flex shrink-0 h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm", brand === 'jaguar' ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-blue-500 to-indigo-600")}>
                <Workflow className="h-4 w-4" />
              </span>
              <span className="text-lg font-bold tracking-tight">Active Pipeline</span>
              <Skeleton className="h-4 w-12 rounded bg-muted-foreground/10" />
            </div>
            <Skeleton className="sm:ml-auto h-6 w-24 rounded-full bg-muted-foreground/10" />
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="hidden lg:flex items-start gap-3">
            {pipelineSteps.map((step, i) => {
              const cfg = getStatusConfig(brand || 'mustang', 0)["idle"]
              return (
                <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-0 rounded-xl">
                  {/* Step number circle */}
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold mb-2 shadow-sm", cfg.nodeFill)}>
                    {i + 1}
                  </div>
                  {/* Card body */}
                  <div className={cn("w-full rounded-xl border px-3 pt-3 pb-2 flex flex-col items-center gap-1 shadow-sm", cfg.cardBg)}>
                    <span className="text-xs font-semibold text-gray-600">{step.label}</span>
                    <Skeleton className="h-7 w-8 rounded bg-muted-foreground/10 my-0.5" />
                    <div className={cn("h-0.5 w-full rounded-full my-1", cfg.bar)} />
                    <div className="flex items-center gap-1">
                      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      <span className="text-[11px] font-medium text-gray-500">{cfg.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="hidden lg:flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", brand === 'jaguar' ? "bg-green-600" : "bg-blue-600")} />
              <span>Received</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Sent</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              <span>Delayed</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:hidden">
            {pipelineSteps.map((step, i) => {
              const cfg = getStatusConfig(brand || 'mustang', 0)["idle"]
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-sm", cfg.nodeFill)}>
                    {i + 1}
                  </div>
                  <div className="flex flex-col text-left gap-1">
                    <span className="text-sm font-semibold text-gray-700">{step.label}</span>
                    <Skeleton className="h-3 w-16 rounded bg-muted-foreground/10" />
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    <span className="text-[11px] font-medium text-gray-500">{cfg.label}</span>
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
      <Card className={cn("relative rounded-2xl border-2 shadow-sm ring-1 overflow-hidden", brand === 'jaguar' ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-card to-emerald-100/60 ring-emerald-100/70" : "border-blue-200/80 bg-gradient-to-br from-blue-50 via-card to-indigo-100/60 ring-blue-100/70")}>
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl z-0" />
        <CardHeader className="pb-4">
          <CardTitle className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-card-foreground">
            <div className="flex items-center gap-2.5">
              <span className={cn("flex shrink-0 h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm", brand === 'jaguar' ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-blue-500 to-indigo-600")}>
                <Workflow className="h-4 w-4" />
              </span>
              <span className="text-lg font-bold tracking-tight">Active Pipeline</span>
              {currentLot && <span className="text-sm font-medium text-muted-foreground">| {currentLot}</span>}
            </div>
            <span className={cn("sm:ml-auto text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow-sm", brand === 'jaguar' ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-blue-500 to-indigo-600")}>{todayLabel}</span>
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
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold mb-2 transition-transform duration-200 group-hover/step:scale-110", cfg.nodeFill)}>
                    {i + 1}
                  </div>
                  {/* Card body */}
                  <div className={cn("w-full rounded-xl border px-3 pt-3 pb-2 flex flex-col items-center gap-1 shadow-sm transition-all duration-200 group-hover/step:shadow-md group-hover/step:-translate-y-0.5", cfg.cardBg)}>
                    <span className="text-xs font-semibold text-gray-600">{step.label}</span>
                    {renderFormattedCounts(step, cfg.countColor, brand)}
                    {step.delayed > 0 && (
                      <div className="flex items-center gap-1 bg-orange-100/50 px-1.5 py-0.5 rounded border border-orange-200/50" title={`${step.delayed} ${step.isBookStage ? 'books' : 'boxes'} delayed > 1 day`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[10px] font-bold leading-none text-orange-600">
                          {step.delayed} delayed
                        </span>
                      </div>
                    )}
                    <div className={cn("h-0.5 w-full rounded-full my-1", cfg.bar)} />
                    <div className="flex items-center gap-1">
                      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      <span className="text-[11px] font-medium text-gray-500">{cfg.label}</span>
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

          {/* Legend */}
          <div className="hidden lg:flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", brand === 'jaguar' ? "bg-green-600" : "bg-blue-600")} />
              <span>Received</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Sent</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              <span>Delayed</span>
            </div>
          </div>

          {/* Mobile: vertical */}
          <div className="flex flex-col gap-3 lg:hidden">
            {pipelineSteps.map((step, i) => {
              const status = getStepStatus(step)
              const cfg = getStatusConfig(brand, step.active)[status]
              const inner = (
                <>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", cfg.nodeFill)}>
                    {i + 1}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-card-foreground">{step.label}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {renderFormattedCounts(step, cfg.countColor, brand)}
                      <span>{step.isBookStage ? (step.active === 1 ? 'Book' : 'Books') : (step.active === 1 ? 'Box' : 'Boxes')}</span>
                    </div>
                    {step.delayed > 0 && (
                      <span className="text-xs text-orange-600 font-medium">{step.delayed} delayed</span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    <span className="text-xs text-muted-foreground">{cfg.label}</span>
                  </div>
                </>
              )
              return (
                <div key={step.label} className={cn("flex items-center gap-3 rounded-xl border p-2.5 shadow-sm", cfg.cardBg)}>
                  {inner}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>


    </>
  )
}
