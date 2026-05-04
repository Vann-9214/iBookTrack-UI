"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function getStepStatus(count: number) {
  if (count >= 5) return "bottleneck"
  if (count >= 3) return "busy"
  if (count === 0) return "idle"
  return "normal"
}

const statusStyles = {
  bottleneck: {
    node: "bg-warning text-warning-foreground border-warning",
    bar: "bg-warning",
    pulse: true,
  },
  busy: {
    node: "bg-primary/20 text-primary border-primary/50",
    bar: "bg-primary",
    pulse: false,
  },
  normal: {
    node: "bg-card text-card-foreground border-border",
    bar: "bg-primary/50",
    pulse: false,
  },
  idle: {
    node: "bg-card text-muted-foreground border-border/50",
    bar: "bg-muted",
    pulse: false,
  },
}

interface ActivePipelineProps {
  currentLot?: string
  stats?: any
}

export function ActivePipeline({ currentLot = "", stats }: ActivePipelineProps) {
  const pipelineSteps = [
    { label: "Warehouse",  count: stats?.pipelineStages?.warehouse  || 0, unit: stats?.pipelineStages?.warehouse  === 1 ? "Box" : "Boxes" },
    { label: "Inventory",  count: stats?.pipelineStages?.inventory  || 0, unit: stats?.pipelineStages?.inventory  === 1 ? "Box" : "Boxes" },
    { label: "Cut",        count: stats?.pipelineStages?.cut        || 0, unit: stats?.pipelineStages?.cut        === 1 ? "Box" : "Boxes" },
    { label: "QC",         count: stats?.pipelineStages?.qc         || 0, unit: stats?.pipelineStages?.qc         === 1 ? "Box" : "Boxes" },
    { label: "Scan",       count: stats?.pipelineStages?.scan       || 0, unit: stats?.pipelineStages?.scan       === 1 ? "Box" : "Boxes" },
    { label: "QA",         count: stats?.pipelineStages?.qa         || 0, unit: stats?.pipelineStages?.qa         === 1 ? "Box" : "Boxes" },
    { label: "Transmit",   count: stats?.pipelineStages?.transmit   || 0, unit: stats?.pipelineStages?.transmit   === 1 ? "Box" : "Boxes" },
    { label: "Storage",    count: stats?.pipelineStages?.storage    || 0, unit: stats?.pipelineStages?.storage    === 1 ? "Box" : "Boxes" },
  ]
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Active Pipeline {currentLot && <span className="text-muted-foreground">| {currentLot}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop: horizontal */}
        <div className="hidden lg:flex items-start gap-0">
          {pipelineSteps.map((step, i) => {
            const status = getStepStatus(step.count)
            const styles = statusStyles[status]
            return (
              <div key={step.label} className="flex items-start flex-1 min-w-0">
                <div className="flex flex-col items-center gap-2 flex-1">
                  {/* Node */}
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-bold transition-all",
                      styles.node,
                      styles.pulse && "animate-pulse"
                    )}
                  >
                    {step.count}
                  </div>
                  {/* Label */}
                  <span className="text-xs font-medium text-center text-card-foreground">
                    {step.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {step.count} {step.unit}
                  </span>
                </div>
                {/* Connector */}
                {i < pipelineSteps.length - 1 && (
                  <div className="flex items-center self-center mt-1 -mx-1">
                    <div className={cn("h-0.5 w-6 xl:w-10", styles.bar)} />
                    <div
                      className={cn(
                        "h-0 w-0 border-y-[4px] border-y-transparent border-l-[6px]",
                        status === "bottleneck"
                          ? "border-l-warning"
                          : status === "busy"
                            ? "border-l-primary"
                            : "border-l-muted-foreground/30"
                      )}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: vertical */}
        <div className="flex flex-col gap-3 lg:hidden">
          {pipelineSteps.map((step, i) => {
            const status = getStepStatus(step.count)
            const styles = statusStyles[status]
            return (
              <div key={step.label} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                    styles.node,
                    styles.pulse && "animate-pulse"
                  )}
                >
                  {step.count}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-card-foreground">{step.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {step.count} {step.unit}
                  </span>
                </div>
                {status === "bottleneck" && (
                  <span className="ml-auto rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
                    BOTTLENECK
                  </span>
                )}
                {i < pipelineSteps.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
