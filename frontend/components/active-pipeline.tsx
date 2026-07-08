"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function getStepStatus(count: number, stage: string) {
  if (stage === "storage") {return count > 0 ? "completed" : "idle"}
  if (count >= 100) return "busy"
  if (count === 0) return "idle"
  return "active"
}

const statusConfig = {
  active: {
    nodeRing: "border-blue-400 text-blue-500",
    countColor: "text-blue-500",
    bar: "bg-blue-400",
    cardBg: "bg-blue-50",
    dot: "bg-blue-400",
    label: "Active",
  },
  busy: {
    nodeRing: "border-orange-400 text-orange-500",
    countColor: "text-orange-500",
    bar: "bg-orange-400",
    cardBg: "bg-orange-50",
    dot: "bg-orange-400",
    label: "Busy",
  },
  idle: {
    nodeRing: "border-gray-300 text-gray-400",
    countColor: "text-gray-400",
    bar: "bg-gray-400",
    cardBg: "bg-gray-50",
    dot: "bg-gray-400",
    label: "Idle",
  },
  completed: {
    nodeRing: "border-green-300 text-green-400",
    countColor: "text-green-400",
    bar: "bg-green-400",
    cardBg: "bg-green-50",
    dot: "bg-green-400",
    label: "Completed",
  },
}

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

  const boxStages = ['warehouse', 'inventory', 'cut', 'endorsement', 'storage']
  const stageData = (stage: string) => {
    const raw = stats?.pipelineStages?.[stage]
    if (raw && typeof raw === 'object' && 'total' in raw) {
      return {
        count: raw.total || 0,
        mustang: raw.mustang || 0,
        jaguar: raw.jaguar || 0,
        isBookStage: false,
      }
    }
    return { count: typeof raw === 'number' ? raw : 0, mustang: 0, jaguar: 0, isBookStage: false }
  }

  const pipelineSteps = [
    { label: "Warehouse",   ...stageData('warehouse'),   stage: "warehouse",   clickable: false },
    { label: "Inventory",   ...stageData('inventory'),   stage: "inventory",   clickable: false },
    { label: "Cut",         ...stageData('cut'),         stage: "cut",         clickable: false },
    { label: "Endorsement", ...stageData('endorsement'), stage: "endorsement", clickable: false },
    { label: "Scan",        count: stats?.pipelineStages?.scan     || 0, mustang: 0, jaguar: 0, isBookStage: true, stage: "scan",        clickable: false },
    { label: "Transmit",    count: stats?.pipelineStages?.transmit || 0, mustang: 0, jaguar: 0, isBookStage: true, stage: "transmit",    clickable: false },
    { label: "Storage",     ...stageData('storage'),     stage: "storage",     clickable: false },
  ]

  if (loading || !stats) {
    return (
      <Card className={cn("border-border bg-card border-t-2", borderColor)}>
        <CardHeader className="pb-4">
          <Skeleton className="h-5 w-40 rounded bg-muted-foreground/20" />
        </CardHeader>
        <CardContent>
          <div className="hidden lg:flex items-start gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-0 rounded-xl">
                <Skeleton className="h-9 w-9 rounded-full mb-2 bg-muted-foreground/20" />
                <div className="w-full rounded-xl px-3 pt-3 pb-2 flex flex-col items-center gap-1">
                  <Skeleton className="h-3.5 w-16 rounded bg-muted-foreground/20" />
                  <Skeleton className="h-7 w-8 rounded bg-muted-foreground/20 my-1" />
                  <Skeleton className="h-0.5 w-full rounded-full bg-muted-foreground/20" />
                  <Skeleton className="h-2.5 w-10 rounded bg-muted-foreground/20" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 lg:hidden">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-muted-foreground/20" />
                <div className="flex flex-col text-left gap-1">
                  <Skeleton className="h-4 w-24 rounded bg-muted-foreground/20" />
                  <Skeleton className="h-3 w-16 rounded bg-muted-foreground/20" />
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Skeleton className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                  <Skeleton className="h-3 w-10 rounded bg-muted-foreground/20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn("border-border bg-card border-t-2", borderColor)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Active Pipeline {currentLot && <span className="text-muted-foreground">| {currentLot}</span>}
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{todayLabel}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop: card layout */}
          <div className="hidden lg:flex items-start gap-3">
            {pipelineSteps.map((step, i) => {
              const status = getStepStatus(step.count, step.stage)
              const cfg = statusConfig[status]
              const inner = (
                <>
                  {/* Step number circle */}
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold mb-2", cfg.nodeRing)}>
                    {i + 1}
                  </div>
                  {/* Card body */}
                  <div className={cn("w-full rounded-xl px-3 pt-3 pb-2 flex flex-col items-center gap-1", cfg.cardBg)}>
                    <span className="text-xs font-semibold text-gray-600">{step.label}</span>
                    <span className={cn("text-2xl font-bold leading-tight", cfg.countColor)}>{step.count}</span>
                    <div className={cn("h-0.5 w-full rounded-full my-1", cfg.bar)} />
                    <div className="flex items-center gap-1">
                      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      <span className="text-[11px] font-medium text-gray-500">{cfg.label}</span>
                    </div>
                    {!step.isBookStage && step.jaguar > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium" title="Jaguar">J {step.jaguar}</span>
                      </div>
                    )}
                  </div>
                </>
              )
              return (
                <div
                  key={step.label}
                  className="flex-1 min-w-0 flex flex-col items-center gap-0 rounded-xl"
                >
                  {inner}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="hidden lg:flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              <span className="text-xs text-muted-foreground">Busy / Bottleneck</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-xs text-muted-foreground">Idle</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
          </div>

          {/* Mobile: vertical */}
          <div className="flex flex-col gap-3 lg:hidden">
            {pipelineSteps.map((step, i) => {
              const status = getStepStatus(step.count, step.stage)
              const cfg = statusConfig[status]
              const inner = (
                <>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", cfg.nodeRing)}>
                    {i + 1}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-card-foreground">{step.label}</span>
                    <span className="text-xs text-muted-foreground">{step.count} {step.isBookStage ? (step.count === 1 ? 'Book' : 'Books') : (step.count === 1 ? 'Box' : 'Boxes')}</span>
                    {!step.isBookStage && step.jaguar > 0 && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">J {step.jaguar}</span>
                      </div>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    <span className="text-xs text-muted-foreground">{cfg.label}</span>
                  </div>
                </>
              )
              return (
                <div key={step.label} className="flex items-center gap-3">
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
