"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { X, Loader2 } from "lucide-react"
import { usePagination } from "@/hooks/usePagination"
import { Pagination } from "@/components/pagination"
import { authFetch } from "@/lib/auth-api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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
    dotLabel: "Active",
    label: "Active",
  },
  busy: {
    nodeRing: "border-orange-400 text-orange-500",
    countColor: "text-orange-500",
    bar: "bg-orange-400",
    cardBg: "bg-orange-50",
    dot: "bg-orange-400",
    dotLabel: "Busy / Bottleneck",
    label: "Busy",
  },
  idle: {
    nodeRing: "border-gray-300 text-gray-400",
    countColor: "text-gray-400",
    bar: "bg-gray-400",
    cardBg: "bg-gray-50",
    dot: "bg-gray-400",
    dotLabel: "Idle",
    label: "Idle",
  },
}

interface ActivePipelineProps {
  currentLot?: string
  stats?: any
}

interface BoxItem {
  id: string
  box_number: string
  lot_id: string
  lot: { lot_number: string } | null
  total_books: number
  current_stage: string
}

export function ActivePipeline({ currentLot = "", stats }: ActivePipelineProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [boxes, setBoxes] = useState<BoxItem[]>([])
  const [loadingBoxes, setLoadingBoxes] = useState(false)
  const pagination = usePagination({ totalItems: boxes.length, defaultPageSize: 10 })

  const pipelineSteps = [
    { label: "Warehouse",    count: stats?.pipelineStages?.warehouse    || 0, unit: stats?.pipelineStages?.warehouse    === 1 ? "Box" : "Boxes", stage: "warehouse" },
    { label: "Inventory",    count: stats?.pipelineStages?.inventory    || 0, unit: stats?.pipelineStages?.inventory    === 1 ? "Box" : "Boxes", stage: "inventory" },
    { label: "Cut",          count: stats?.pipelineStages?.cut          || 0, unit: stats?.pipelineStages?.cut          === 1 ? "Box" : "Boxes", stage: "cut" },
    { label: "Endorsement",  count: stats?.pipelineStages?.endorsement  || 0, unit: stats?.pipelineStages?.endorsement  === 1 ? "Box" : "Boxes", stage: "endorsement" },
    { label: "Scan",         count: stats?.pipelineStages?.scan         || 0, unit: stats?.pipelineStages?.scan         === 1 ? "Box" : "Boxes", stage: "scan" },
    { label: "Transmit",     count: stats?.pipelineStages?.transmit     || 0, unit: stats?.pipelineStages?.transmit     === 1 ? "Box" : "Boxes", stage: "transmit" },
    { label: "Storage",      count: stats?.pipelineStages?.storage      || 0, unit: stats?.pipelineStages?.storage      === 1 ? "Box" : "Boxes", stage: "storage" },
  ]

  // Fetch boxes for selected stage
  useEffect(() => {
    if (!selectedStage) return
    
    const fetchBoxes = async () => {
      setLoadingBoxes(true)
      try {
        const res = await authFetch(`${API_URL}/api/boxes?current_stage=${selectedStage}`)
        const data = await res.json()
        setBoxes(data.boxes || [])
        pagination.goToPage(1)
      } catch (error) {
        console.error('Failed to fetch boxes:', error)
        setBoxes([])
      } finally {
        setLoadingBoxes(false)
      }
    }
    
    fetchBoxes()
  }, [selectedStage])

  // Get current page of boxes
  const paginatedBoxes = boxes.slice(pagination.offset, pagination.offset + pagination.limit)
  const selectedStepLabel = pipelineSteps.find(s => s.stage === selectedStage)?.label

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
              return (
                <button
                  key={step.label}
                  onClick={() => step.count > 0 && setSelectedStage(step.stage)}
                  disabled={step.count === 0}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center gap-0 rounded-xl transition-all duration-200",
                    step.count > 0 ? "cursor-pointer hover:scale-105 hover:brightness-95" : "cursor-default"
                  )}
                  title={step.count > 0 ? `Click to view ${step.count} ${step.unit.toLowerCase()} in ${step.label}` : `No boxes in ${step.label}`}
                >
                  {/* Step number circle */}
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold mb-2", cfg.nodeRing)}>
                    {i + 1}
                  </div>
                  {/* Card body */}
                  <div className={cn("w-full rounded-xl px-3 pt-3 pb-2 flex flex-col items-center gap-1", cfg.cardBg)}>
                    <span className="text-xs font-semibold text-gray-600">{step.label}</span>
                    <span className={cn("text-2xl font-bold leading-tight", cfg.countColor)}>{step.count}</span>
                    {/* Colored underline bar */}
                    <div className={cn("h-0.5 w-full rounded-full my-1", cfg.bar)} />
                    {/* Status dot + label */}
                    <div className="flex items-center gap-1">
                      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      <span className="text-[11px] font-medium text-gray-500">{cfg.label}</span>
                    </div>
                  </div>
                </button>
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
              return (
                <button
                  key={step.label}
                  onClick={() => step.count > 0 && setSelectedStage(step.stage)}
                  disabled={step.count === 0}
                  className={cn(
                    "flex items-center gap-3 transition-opacity",
                    step.count === 0 ? "cursor-not-allowed opacity-50" : "hover:opacity-80"
                  )}
                >
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
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal for viewing boxes in selected stage */}
      {selectedStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedStage(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Boxes in {selectedStepLabel}
              </h3>
              <button
                onClick={() => setSelectedStage(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            {loadingBoxes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : paginatedBoxes.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No boxes found in this stage.
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto mb-4">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Box #</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Lot #</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Books</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBoxes.map((box) => (
                        <tr key={box.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-foreground">{box.box_number}</td>
                          <td className="py-3 px-4 text-foreground">{box.lot?.lot_number || '—'}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">{box.total_books}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    pageSize={pagination.pageSize}
                    onPageChange={pagination.goToPage}
                    onPageSizeChange={pagination.setPageSize}
                    canPrevPage={pagination.canPrevPage}
                    canNextPage={pagination.canNextPage}
                    className="mt-auto"
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
