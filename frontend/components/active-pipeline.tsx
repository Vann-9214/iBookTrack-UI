"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { X, Loader2 } from "lucide-react"
import { authFetch } from "@/lib/auth-api"
import { usePagination } from "@/hooks/usePagination"
import { Pagination } from "@/components/pagination"

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

interface RawRow {
  ISBN: string
  BoxNumber: string
  ScanUser: string
  MachineName: string
  PageCount: number
  ScanDate: string
  Status: string
  LastUpdated: string
}

export function ActivePipeline({ currentLot = "", stats }: ActivePipelineProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRows, setModalRows] = useState<RawRow[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [modalPage, setModalPage] = useState(1)
  const MODAL_PAGE_SIZE = 50

  const pipelineSteps = [
    { label: "Warehouse",   count: stats?.pipelineStages?.warehouse   || 0, unit: stats?.pipelineStages?.warehouse   === 1 ? "Box"  : "Boxes", stage: "warehouse",   clickable: false },
    { label: "Inventory",   count: stats?.pipelineStages?.inventory   || 0, unit: stats?.pipelineStages?.inventory   === 1 ? "Box"  : "Boxes", stage: "inventory",   clickable: false },
    { label: "Cut",         count: stats?.pipelineStages?.cut         || 0, unit: stats?.pipelineStages?.cut         === 1 ? "Box"  : "Boxes", stage: "cut",         clickable: false },
    { label: "Endorsement", count: stats?.pipelineStages?.endorsement || 0, unit: stats?.pipelineStages?.endorsement === 1 ? "Box"  : "Boxes", stage: "endorsement", clickable: false },
    { label: "Scan",        count: stats?.pipelineStages?.scan        || 0, unit: stats?.pipelineStages?.scan        === 1 ? "Book" : "Books", stage: "scan",        clickable: true  },
    { label: "Transmit",    count: stats?.pipelineStages?.transmit    || 0, unit: stats?.pipelineStages?.transmit    === 1 ? "Book" : "Books", stage: "transmit",    clickable: false },
    { label: "Storage",     count: stats?.pipelineStages?.storage     || 0, unit: stats?.pipelineStages?.storage     === 1 ? "Box"  : "Boxes", stage: "storage",     clickable: false },
  ]

  const openScanModal = async () => {
    setModalOpen(true)
    setModalLoading(true)
    setModalRows([])
    setModalPage(1)
    setStatusFilter('ALL')
    try {
      const rowsRes = await authFetch(`${API_URL}/api/scanning/scan-rows`)
      if (rowsRes.ok) {
        const json = await rowsRes.json()
        setModalRows(json.rows || [])
      }
    } catch (e) {
      console.error('Failed to load scan rows', e)
    } finally {
      setModalLoading(false)
    }
  }

  // Reset modal pagination when the status filter changes
  useEffect(() => {
    setModalPage(1)
  }, [statusFilter])

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
              return step.clickable ? (
                <button
                  key={step.label}
                  onClick={openScanModal}
                  className="flex-1 min-w-0 flex flex-col items-center gap-0 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {inner}
                </button>
              ) : (
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
              return step.clickable ? (
                <button
                  key={step.label}
                  onClick={openScanModal}
                  className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                >
                  {inner}
                </button>
              ) : (
                <div key={step.label} className="flex items-center gap-3">
                  {inner}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scan modal */}
      {modalOpen && (() => {
        const statusOptions = ['ALL', ...Array.from(new Set(modalRows.map(r => r.Status).filter(Boolean))).sort()]
        const filtered = statusFilter === 'ALL' ? modalRows : modalRows.filter(r => r.Status === statusFilter)
        const totalPages = Math.max(1, Math.ceil(filtered.length / MODAL_PAGE_SIZE))
        const safePage = Math.min(modalPage, totalPages)
        const paginated = filtered.slice((safePage - 1) * MODAL_PAGE_SIZE, safePage * MODAL_PAGE_SIZE)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Scan Stage — Raw Rows</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Scanning → Preval · today · one row per ISBN (latest status)</p>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-4 px-6 py-3 border-b bg-gray-50 shrink-0">
                <span className="text-sm text-gray-500">Total rows: <span className="font-semibold text-gray-800">{modalRows.length}</span></span>
                <span className="text-sm text-gray-500">Pipeline card: <span className="font-semibold text-orange-500">{stats?.pipelineStages?.scan ?? '—'}</span></span>
                <span className="text-sm text-gray-500">Showing: <span className="font-semibold text-gray-800">{filtered.length}</span></span>
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-xs text-gray-500">Filter by status</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1">
                {modalLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-12">No rows found</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white border-b z-10">
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">ISBN</th>
                        <th className="px-3 py-2 font-medium">BoxNumber</th>
                        <th className="px-3 py-2 font-medium">ScanUser</th>
                        <th className="px-3 py-2 font-medium">MachineName</th>
                        <th className="px-3 py-2 font-medium">PageCount</th>
                        <th className="px-3 py-2 font-medium">ScanDate</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((row, i) => {
                        const rowNumber = (safePage - 1) * MODAL_PAGE_SIZE + i + 1
                        return (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-400">{rowNumber}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-800">{row.ISBN || '—'}</td>
                          <td className="px-3 py-1.5 text-gray-600">{row.BoxNumber || '—'}</td>
                          <td className="px-3 py-1.5 text-gray-600">{row.ScanUser || '—'}</td>
                          <td className="px-3 py-1.5 text-gray-600">{row.MachineName || '—'}</td>
                          <td className="px-3 py-1.5 text-right text-gray-600">{row.PageCount ?? '—'}</td>
                          <td className="px-3 py-1.5 text-gray-500">{row.ScanDate ? new Date(row.ScanDate).toLocaleDateString() : '—'}</td>
                          <td className="px-3 py-1.5">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap",
                              row.Status?.includes('COMPLETED') ? "bg-green-100 text-green-700" :
                              row.Status?.includes('ONGOING')   ? "bg-blue-100 text-blue-700"  :
                              row.Status?.includes('FAILED')    ? "bg-red-100 text-red-600"    :
                              "bg-gray-100 text-gray-600"
                            )}>
                              {row.Status}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{row.LastUpdated ? new Date(row.LastUpdated).toLocaleTimeString() : '—'}</td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {!modalLoading && filtered.length > 0 && (
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  pageSize={MODAL_PAGE_SIZE}
                  onPageChange={setModalPage}
                  onPageSizeChange={() => {}}
                  canPrevPage={safePage > 1}
                  canNextPage={safePage < totalPages}
                  pageSizeOptions={[50]}
                />
              )}

            </div>
          </div>
        )
      })()}
    </>
  )
}
