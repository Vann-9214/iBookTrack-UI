"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function getStepStatus(count: number) {
  if (count >= 5) return "busy"
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
}

interface ActivePipelineProps {
  currentLot?: string
  stats?: any
}

export function ActivePipeline({ currentLot = "", stats }: ActivePipelineProps) {
  const pipelineSteps = [
    { label: "Warehouse",   count: stats?.pipelineStages?.warehouse   || 0, unit: stats?.pipelineStages?.warehouse   === 1 ? "Box"  : "Boxes", stage: "warehouse",   clickable: false },
    { label: "Inventory",   count: stats?.pipelineStages?.inventory   || 0, unit: stats?.pipelineStages?.inventory   === 1 ? "Box"  : "Boxes", stage: "inventory",   clickable: false },
    { label: "Cut",         count: stats?.pipelineStages?.cut         || 0, unit: stats?.pipelineStages?.cut         === 1 ? "Box"  : "Boxes", stage: "cut",         clickable: false },
    { label: "Endorsement", count: stats?.pipelineStages?.endorsement || 0, unit: stats?.pipelineStages?.endorsement === 1 ? "Box"  : "Boxes", stage: "endorsement", clickable: false },
    { label: "Scan",        count: stats?.pipelineStages?.scan        || 0, unit: stats?.pipelineStages?.scan        === 1 ? "Book" : "Books", stage: "scan",        clickable: false },
    { label: "Transmit",    count: stats?.pipelineStages?.transmit    || 0, unit: stats?.pipelineStages?.transmit    === 1 ? "Book" : "Books", stage: "transmit",    clickable: false },
    { label: "Storage",     count: stats?.pipelineStages?.storage     || 0, unit: stats?.pipelineStages?.storage     === 1 ? "Box"  : "Boxes", stage: "storage",     clickable: false },
  ]

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Active Pipeline {currentLot && <span className="text-muted-foreground">| {currentLot}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop: card layout */}
          <div className="hidden lg:flex items-start gap-3">
            {pipelineSteps.map((step, i) => {
              const status = getStepStatus(step.count)
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
          </div>

          {/* Mobile: vertical */}
          <div className="flex flex-col gap-3 lg:hidden">
            {pipelineSteps.map((step, i) => {
              const status = getStepStatus(step.count)
              const cfg = statusConfig[status]
              const inner = (
                <>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", cfg.nodeRing)}>
                    {i + 1}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-card-foreground">{step.label}</span>
                    <span className="text-xs text-muted-foreground">{step.count} {step.unit}</span>
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
