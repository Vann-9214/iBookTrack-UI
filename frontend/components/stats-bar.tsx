'use client'

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  FileOutput,
  FileText,
  HeartPulse,
  Loader2,
  Package,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { authFetch } from "@/lib/auth-api"
import { usePagination } from "@/hooks/usePagination"
import { Pagination } from "@/components/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { useBrand } from "@/hooks/use-brand"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

interface QCFlag {
  scan_id: string
  isbn: string
  title: string | null
  issue: string
  remarks: string | null
  flagged_by_name: string | null
  flagged_at: string
  assigned_box?: {
    box_number: string
    box_type?: string | null
    lot?: { lot_number: string }
  }
}

interface LiveLot {
  id: string
  lot_number: string
  total_boxes: number
  total_books: number
  status: string
  completion_progress: number
}

interface DailyOutputRow {
  isbn: string
  title: string | null
  lot_number: string
  box_number: string
  scan_user: string
  page_count: number
  completed_at: string
}

interface StatsBarProps {
  stats?: any
  refreshKey?: number
  loading?: boolean
}

export function StatsBar({ stats: dashboardStats, refreshKey, loading = false }: StatsBarProps) {
  const { brand } = useBrand()
  const [flagsOpen, setFlagsOpen] = useState(false)
  const [flags, setFlags] = useState<QCFlag[]>([])
  const [totalFlags, setTotalFlags] = useState(0)
  const [loadingFlags, setLoadingFlags] = useState(false)
  const flagsPagination = usePagination({ totalItems: totalFlags, defaultPageSize: 50 })

  const [liveLotsOpen, setLiveLotsOpen] = useState(false)
  const [liveLots, setLiveLots] = useState<LiveLot[]>([])
  const [loadingLiveLots, setLoadingLiveLots] = useState(false)
  const [selectedLot, setSelectedLot] = useState<LiveLot | null>(null)

  const [dailyOutputOpen, setDailyOutputOpen] = useState(false)
  const [dailyOutputRows, setDailyOutputRows] = useState<DailyOutputRow[]>([])
  const [totalDailyOutput, setTotalDailyOutput] = useState(0)
  const [loadingDailyOutput, setLoadingDailyOutput] = useState(false)
  const [dailyOutputSort, setDailyOutputSort] = useState<'desc' | 'asc'>('desc')
  const dailyOutputPagination = usePagination({ totalItems: totalDailyOutput, defaultPageSize: 50 })

  const [flagsClosing, setFlagsClosing] = useState(false)
  const [liveLotsClosing, setLiveLotsClosing] = useState(false)
  const [dailyOutputClosing, setDailyOutputClosing] = useState(false)

  const fetchLiveLots = async (background = false) => {
    if (!background) setLoadingLiveLots(true)
    try {
      const res = await authFetch(`${API_URL}/api/dashboard/open-lots?brand=${brand}`)
      const data = await res.json()
      
      const mappedLots = (data.lots || []).map((l: any) => {
        return {
          id: l.id,
          lot_number: l.lot_number,
          total_boxes: l.total_boxes,
          total_books: l.total_books,
          status: l.status,
          completion_progress: l.completion_progress
        }
      })
      setLiveLots(mappedLots)
      if (selectedLot) {
        const updated = mappedLots.find((ml: any) => ml.id === selectedLot.id)
        if (updated) setSelectedLot(updated)
      }
    } catch {
      setLiveLots([])
    } finally {
      setLoadingLiveLots(false)
    }
  }

  const openLiveLots = async () => {
    setLiveLotsOpen(true)
    setSelectedLot(null)
    if (liveLots.length > 0) return
    await fetchLiveLots()
  }

  useEffect(() => {
    if (refreshKey === undefined || !liveLotsOpen) return
    fetchLiveLots(true)
  }, [refreshKey, liveLotsOpen])

  const fetchFlags = async (page = 1, background = false) => {
    if (!background) setLoadingFlags(true)
    try {
      const res = await authFetch(`${API_URL}/api/dashboard/qc-flags?page=${page}&limit=10&today=true&box_type=${brand}`)
      const data = await res.json()
      const validBrands = ['Mustang', 'Jaguar']
      const filtered = (data.flags || []).filter((f: QCFlag) => {
        const type = f.assigned_box?.box_type
        if (!type || !validBrands.includes(type)) return false
        return type === brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
      })
      setFlags(filtered)
      setTotalFlags(data.total || 0)
    } catch {
      setFlags([])
      setTotalFlags(0)
    } finally {
      setLoadingFlags(false)
    }
  }

  const openFlags = async () => {
    setFlagsOpen(true)
    flagsPagination.goToPage(1)
    if (flags.length > 0) return
    await fetchFlags(1)
  }

  const fetchDailyOutput = async (page = 1, background = false) => {
    if (!background) setLoadingDailyOutput(true)
    try {
      const res = await authFetch(`${API_URL}/api/dashboard/daily-output?page=${page}&limit=${dailyOutputPagination.pageSize}&brand=${brand}&sort=${dailyOutputSort}`)
      const data = await res.json()
      setDailyOutputRows(data.rows || [])
      setTotalDailyOutput(data.total || 0)
    } catch {
      setDailyOutputRows([])
      setTotalDailyOutput(0)
    } finally {
      setLoadingDailyOutput(false)
    }
  }

  const openDailyOutput = async () => {
    setDailyOutputOpen(true)
    dailyOutputPagination.goToPage(1)
    if (dailyOutputRows.length > 0) return
    await fetchDailyOutput(1)
  }

  useEffect(() => {
    setFlags([])
    setTotalFlags(0)
    setLiveLots([])
    setDailyOutputRows([])
    setTotalDailyOutput(0)
  }, [brand])

  useEffect(() => {
    if (refreshKey === undefined || !flagsOpen) return
    fetchFlags(flagsPagination.currentPage, true)
  }, [refreshKey, flagsOpen])

  useEffect(() => {
    if (!flagsOpen) return
    fetchFlags(flagsPagination.currentPage)
  }, [flagsPagination.currentPage])

  useEffect(() => {
    if (refreshKey === undefined || !dailyOutputOpen) return
    fetchDailyOutput(dailyOutputPagination.currentPage, true)
  }, [refreshKey, dailyOutputOpen])

  useEffect(() => {
    if (!dailyOutputOpen) return
    fetchDailyOutput(dailyOutputPagination.currentPage)
  }, [dailyOutputPagination.currentPage, dailyOutputSort])

  const dismissFlags = () => {
    if (flagsClosing) return
    setFlagsClosing(true)
    setTimeout(() => { setFlagsOpen(false); setFlagsClosing(false) }, 340)
  }

  const dismissLiveLots = () => {
    if (liveLotsClosing) return
    setLiveLotsClosing(true)
    setTimeout(() => { setLiveLotsOpen(false); setSelectedLot(null); setLiveLotsClosing(false) }, 340)
  }

  const dismissDailyOutput = () => {
    if (dailyOutputClosing) return
    setDailyOutputClosing(true)
    setTimeout(() => { setDailyOutputOpen(false); setDailyOutputClosing(false) }, 340)
  }

  const ISSUE_LABELS: Record<string, string> = {
    'bent-page': 'Bent Page', 'torn-page': 'Torn Page', 'missing-page': 'Missing Page',
    'water-damage': 'Water Damage', 'wrong-isbn': 'Wrong ISBN', 'duplicate': 'Duplicate',
    'cover-damage': 'Cover Damage', 'spine-damage': 'Spine Damage', 'other': 'Other',
  }

  const activeLots = dashboardStats?.activeLots || 0
  const unaccounted = dashboardStats?.unaccountedBooks || 0
  const dailyOutput = dashboardStats?.dailyTransmitted || 0
  const totalBooks = dashboardStats?.totalBooks || 0

  const isJaguar = brand === 'jaguar'

  /* Full class strings (Tailwind needs them static). "theme" resolves to the
     active brand tone so the KPI cards visibly shift blue↔green. */
  const TONE = {
    theme: isJaguar
      ? {
          card: "bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 border-2 border-emerald-200/80 ring-emerald-100/70",
          icon: "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25",
          value: "text-emerald-700",
          title: "text-emerald-950/70",
          sub: "text-emerald-600/80",
          hover: "hover:shadow-emerald-200/60",
        }
      : {
          card: "bg-gradient-to-br from-blue-50 via-white to-indigo-100/60 border-2 border-blue-200/80 ring-blue-100/70",
          icon: "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25",
          value: "text-blue-700",
          title: "text-blue-950/70",
          sub: "text-blue-600/80",
          hover: "hover:shadow-blue-200/60",
        },
    red: {
      card: "bg-gradient-to-br from-red-50 via-white to-rose-100/60 border-2 border-red-200/80 ring-red-100/70",
      icon: "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/25",
      value: "text-red-600",
      title: "text-red-950/70",
      sub: "text-red-500/80",
      hover: "hover:shadow-red-200/60",
    },
    /* Bold theme variant for the headline "Total Books" card */
    solid: isJaguar
      ? {
          card: "bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-600 border-2 border-emerald-600/40 ring-emerald-300/30 text-white",
          icon: "bg-white/20 shadow-black/10",
          value: "text-white",
          title: "text-white/90",
          sub: "text-white/70",
          hover: "hover:shadow-emerald-500/40",
        }
      : {
          card: "bg-gradient-to-br from-blue-500 via-blue-500 to-indigo-600 border-2 border-blue-600/40 ring-blue-300/30 text-white",
          icon: "bg-white/20 shadow-black/10",
          value: "text-white",
          title: "text-white/90",
          sub: "text-white/70",
          hover: "hover:shadow-blue-500/40",
        },
  } as const

  /* Theme-aware palette for the brand-colored modals (Live Lots, Daily Output) */
  const M = isJaguar
    ? {
        headerBg: "bg-gradient-to-r from-emerald-50 to-white",
        iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20",
        dot: "bg-emerald-500",
        accent: "text-emerald-600",
        soft: "text-emerald-500",
        border: "border-emerald-100",
        softBg: "bg-gradient-to-br from-emerald-50 to-white",
        bar: "bg-gradient-to-r from-emerald-400 to-emerald-600",
        track: "bg-emerald-100",
        rowHover: "hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent",
        chip: "bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700",
      }
    : {
        headerBg: "bg-gradient-to-r from-blue-50 to-white",
        iconBg: "bg-gradient-to-br from-blue-400 to-blue-600 shadow-md shadow-blue-500/20",
        dot: "bg-blue-500",
        accent: "text-blue-600",
        soft: "text-blue-500",
        border: "border-blue-100",
        softBg: "bg-gradient-to-br from-blue-50 to-white",
        bar: "bg-gradient-to-r from-blue-400 to-blue-600",
        track: "bg-blue-100",
        rowHover: "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent",
        chip: "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700",
      }

  const stats = [
    {
      title: "Non-Processable",
      value: unaccounted.toLocaleString(),
      subtext: "flagged today",
      icon: AlertTriangle,
      tone: TONE.red,
      onClick: openFlags,
    },
    {
      title: "Live Lots",
      value: activeLots.toLocaleString(),
      subtext: "actively processing",
      icon: Activity,
      tone: TONE.theme,
      onClick: openLiveLots,
    },
    {
      title: "Daily Output",
      value: dailyOutput.toLocaleString(),
      subtext: "books transmitted",
      icon: FileOutput,
      tone: TONE.theme,
      onClick: openDailyOutput,
    },
    {
      title: "Total Books",
      value: totalBooks.toLocaleString(),
      subtext: "in system",
      icon: HeartPulse,
      tone: TONE.solid,
      onClick: undefined,
    },
  ]

  return (
    <>
      {loading || !dashboardStats ? (
        /* ΓöÇΓöÇ Skeleton ΓöÇΓöÇ */
        <>
          {/* Mobile 2x2 skeleton */}
          <div className="grid grid-cols-2 gap-2.5 sm:hidden">
            {stats.map((stat, i) => {
              const isSolid = stat.tone === TONE.solid
              const skColor = isSolid ? "bg-white/25" : "bg-muted-foreground/20"
              return (
                <div key={i} className={cn("rounded-2xl border p-3 flex items-center gap-2.5 shadow-sm ring-1 overflow-hidden", stat.tone.card)}>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shadow-md shrink-0", stat.tone.icon)}>
                    <Skeleton className={cn("h-4 w-4 rounded-sm", isSolid ? "bg-white/30" : "bg-white/50")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Skeleton className={cn("h-4 w-12 mb-1.5 rounded", skColor)} />
                    <Skeleton className={cn("h-2 w-16 rounded", skColor)} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden sm:grid grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map((stat, i) => {
              const isSolid = stat.tone === TONE.solid
              const skColor = isSolid ? "bg-white/30" : "bg-muted-foreground/15"
              return (
                <div key={i} className={cn("relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1", stat.tone.card)}>
                  <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
                  <div className="relative flex items-start justify-between mb-3">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg", stat.tone.icon)}>
                      <Skeleton className={cn("h-6 w-6 rounded-md", isSolid ? "bg-white/30" : "bg-white/50")} />
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
          <div className="grid grid-cols-2 gap-2.5 sm:hidden">
            {stats.map((stat) => (
              <div
                key={stat.title}
                role={stat.onClick ? "button" : undefined}
                onClick={stat.onClick}
                className={cn(
                  "rounded-2xl border p-3 flex items-center gap-2.5 shadow-sm ring-1 transition-all duration-200 active:scale-[0.97] overflow-hidden",
                  stat.tone.card,
                  stat.onClick ? "cursor-pointer" : "cursor-default"
                )}
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md shrink-0", stat.tone.icon)}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-lg font-black leading-none tracking-tight truncate", stat.tone.value)}>{stat.value}</div>
                  <div className={cn("text-[11px] font-semibold truncate mt-1", stat.tone.title)}>{stat.title}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop: full cards ── */}
          <div className="hidden sm:grid grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.title}
                role={stat.onClick ? "button" : undefined}
                onClick={stat.onClick}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                  stat.tone.card, stat.tone.hover,
                  stat.onClick ? "cursor-pointer" : "cursor-default"
                )}
              >
                {/* subtle top-light sheen */}
                <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/25 blur-2xl" />
                <div className="relative flex items-start justify-between mb-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110", stat.tone.icon)}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className={cn("text-4xl font-black mb-0.5 tracking-tight tabular-nums", stat.tone.value)}>{stat.value}</div>
                </div>
                <div className={cn("relative text-sm font-semibold mb-0.5", stat.tone.title)}>{stat.title}</div>
                <div className={cn("relative text-xs font-medium", stat.tone.sub)}>{stat.subtext}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* QC Flagged Books Modal */}
      {flagsOpen && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4", flagsClosing ? 'animate-overlay-out' : 'animate-overlay-in')} onClick={dismissFlags}>
          <div className={cn("bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-black/5", flagsClosing ? 'animate-modal-origin-out' : 'animate-modal-origin')} data-modal-origin-surface onClick={e => e.stopPropagation()}>

            {/* Red header */}
            <div className="px-6 py-5 flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-gray-800">Non-Processable Books</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-500">Needs review</span>
                  </div>
                </div>
              </div>
              <button
                onClick={dismissFlags}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white text-gray-500 hover:text-gray-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            {loadingFlags ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading flagged books...</span>
              </div>
            ) : flags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <span className="text-sm font-semibold text-gray-600">No flagged books</span>
                <span className="text-xs text-gray-400">Everything looks clean for today</span>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 px-3 pb-2">
                <table className="w-full text-sm table-fixed border-separate border-spacing-y-1">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-36" />
                    <col className="hidden sm:table-column" />
                    <col className="w-28" />
                    <col className="w-52" />
                    <col className="w-36" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_-12px_0_0_white]">
                    <tr>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">ISBN</th>
                      <th className="hidden sm:table-cell text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Lot &amp; Box</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Issue</th>
                      <th className="text-left py-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Flagged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.map((f, i) => (
                      <tr key={f.scan_id} className="bg-gray-50/60 hover:bg-red-50/50 transition-colors align-middle [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
                        <td className="py-2 px-3 text-xs font-medium text-gray-400 align-middle">{(flagsPagination.currentPage - 1) * flagsPagination.pageSize + i + 1}</td>
                        <td className="py-2 px-3 font-mono text-xs font-semibold text-gray-800 truncate align-middle">{f.isbn}</td>
                        <td className="hidden sm:table-cell py-2 px-3 text-gray-600 truncate align-middle">{f.title || '—'}</td>
                        <td className="text-xs px-3 py-2 align-middle whitespace-nowrap">
                          <span className="font-bold text-gray-800">{f.assigned_box?.lot?.lot_number || '—'}</span>
                          {f.assigned_box?.box_number && (
                            <span className="ml-1.5 font-mono text-gray-400">{f.assigned_box.box_number}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700 whitespace-nowrap ring-1 ring-red-200/60">
                              {ISSUE_LABELS[f.issue] || f.issue}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 uppercase ring-1 ring-red-200/60">
                              {(f.flagged_by_name || '—').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('') || '?'}
                            </span>
                            <span className="truncate text-gray-700 font-medium">{f.flagged_by_name || '—'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {flagsPagination.totalPages > 1 && (
              <div className="border-t border-gray-100 px-4 py-3 shrink-0">
                <Pagination
                  currentPage={flagsPagination.currentPage}
                  totalPages={flagsPagination.totalPages}
                  pageSize={flagsPagination.pageSize}
                  onPageChange={flagsPagination.goToPage}
                  onPageSizeChange={flagsPagination.setPageSize}
                  canPrevPage={flagsPagination.canPrevPage}
                  canNextPage={flagsPagination.canNextPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Lots modal */}
      {liveLotsOpen && (
        <div
          className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4", liveLotsClosing ? 'animate-overlay-out' : 'animate-overlay-in')}
          onClick={dismissLiveLots}
        >
          <div
            className={cn("bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-black/5", liveLotsClosing ? 'animate-modal-origin-out' : 'animate-modal-origin')}
            data-modal-origin-surface
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={cn("px-6 py-5 flex items-center justify-between", M.headerBg)}>
              <div className="flex items-center gap-3">
                {selectedLot ? (
                  <button
                    onClick={() => setSelectedLot(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-600 hover:text-gray-900 shadow-sm transition-colors"
                    aria-label="Back to lots list"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg", M.iconBg)}>
                    <Activity className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-gray-800">
                    {selectedLot ? selectedLot.lot_number : 'Live Lots'}
                  </h3>
                  {!selectedLot && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-xs text-gray-500">
                        {liveLots.filter(l => l.status !== 'Completed').length} open · {liveLots.filter(l => l.status === 'Completed').length} completed
                      </span>
                    </div>
                  )}
                  {selectedLot && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("h-2 w-2 rounded-full", M.dot)} />
                      <span className="text-xs text-gray-500">Lot details</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={dismissLiveLots}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white text-gray-500 hover:text-gray-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            {loadingLiveLots ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading open lots...</span>
              </div>
            ) : selectedLot ? (
              /* Detail view */
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Total books', value: selectedLot.total_books.toLocaleString(), icon: BookOpen },
                    { label: 'Total boxes', value: selectedLot.total_boxes.toLocaleString(), icon: Package },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className={cn("rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all hover:shadow-md", TONE.theme.card)}>
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white mb-4", TONE.theme.icon)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className={cn("text-[11px] font-bold uppercase tracking-wider mb-0.5", TONE.theme.title)}>{label}</p>
                        <p className={cn("text-3xl font-black tracking-tight tabular-nums", TONE.theme.value)}>{value}</p>
                      </div>
                    </div>
                  ))}

                  <div className={cn("col-span-2 rounded-2xl p-6 shadow-sm flex items-center gap-6 transition-all hover:shadow-md", TONE.theme.card)}>
                    {(() => {
                      const isCompleted = selectedLot.status === 'Completed' || selectedLot.completion_progress === 100;
                      return (
                        <>
                          {isCompleted ? (
                            <div className={cn("flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-[5px] text-white shadow-md", TONE.theme.icon, isJaguar ? "border-emerald-200" : "border-blue-200")}>
                              <Check className="h-8 w-8" strokeWidth={4} />
                            </div>
                          ) : (
                            <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center">
                              <svg className="absolute inset-0 h-[88px] w-[88px] -rotate-90" viewBox="0 0 100 100">
                                <defs>
                                  <linearGradient id="detailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    {isJaguar ? (
                                      <>
                                        <stop offset="0%" stopColor="#34d399" />
                                        <stop offset="100%" stopColor="#059669" />
                                      </>
                                    ) : (
                                      <>
                                        <stop offset="0%" stopColor="#60a5fa" />
                                        <stop offset="100%" stopColor="#2563eb" />
                                      </>
                                    )}
                                  </linearGradient>
                                </defs>
                                <circle
                                  className="text-gray-100"
                                  strokeWidth="7"
                                  stroke="currentColor"
                                  fill="transparent"
                                  r="40"
                                  cx="50"
                                  cy="50"
                                />
                                <circle
                                  strokeWidth="7"
                                  strokeDasharray={251.3}
                                  strokeDashoffset={251.3 - (251.3 * selectedLot.completion_progress) / 100}
                                  strokeLinecap="round"
                                  stroke="url(#detailGrad)"
                                  fill="transparent"
                                  r="40"
                                  cx="50"
                                  cy="50"
                                />
                              </svg>
                              <span className="text-xl font-bold text-gray-800">{selectedLot.completion_progress}%</span>
                            </div>
                          )}
                          <div className="flex flex-col justify-center">
                            <span className={cn("text-base font-bold", TONE.theme.value)}>Overall completion</span>
                            <span className={cn("text-sm mt-1", TONE.theme.sub)}>
                              {isCompleted 
                                ? "Completed" 
                                : `${selectedLot.total_books.toLocaleString()} books packed across ${selectedLot.total_boxes.toLocaleString()} box${selectedLot.total_boxes !== 1 ? 'es' : ''}`}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : liveLots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg", M.iconBg)}>
                  <Activity className="h-7 w-7" />
                </div>
                <span className="text-sm font-medium text-gray-500">No open lots currently</span>
              </div>
            ) : (
              /* List view */
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {liveLots.map((lot) => {
                  const isCompleted = lot.status === 'Completed' || lot.completion_progress === 100;
                  return (
                    <button
                      key={lot.id}
                      onClick={() => setSelectedLot(lot)}
                      className={cn("group/lot w-full flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-left transition-all hover:shadow-sm hover:border-transparent", M.rowHover)}
                    >
                      {/* Left Icon */}
                      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm", M.iconBg)}>
                        <Package className="h-6 w-6" />
                      </div>

                      {/* Middle Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 truncate">{lot.lot_number}</span>
                          {isCompleted ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              Completed
                            </span>
                          ) : (
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", M.chip)}>
                              {lot.status}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                          <span>{lot.total_boxes.toLocaleString()} boxes</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300" />
                          <span>{lot.total_books.toLocaleString()} books</span>
                        </div>
                      </div>

                      {/* Right Info */}
                      <div className="flex items-center gap-3 shrink-0">
                        {isCompleted ? (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-md shadow-green-500/20">
                            <Check className="h-6 w-6 text-white" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                            <svg className="absolute inset-0 h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                              <defs>
                                <linearGradient id={`listGrad-${lot.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  {isJaguar ? (
                                    <>
                                      <stop offset="0%" stopColor="#34d399" />
                                      <stop offset="100%" stopColor="#059669" />
                                    </>
                                  ) : (
                                    <>
                                      <stop offset="0%" stopColor="#60a5fa" />
                                      <stop offset="100%" stopColor="#2563eb" />
                                    </>
                                  )}
                                </linearGradient>
                              </defs>
                              <circle
                                className="text-gray-100"
                                strokeWidth="4"
                                stroke="currentColor"
                                fill="transparent"
                                r="20"
                                cx="24"
                                cy="24"
                              />
                              <circle
                                strokeWidth="4"
                                strokeDasharray={125.66}
                                strokeDashoffset={125.66 - (125.66 * lot.completion_progress) / 100}
                                strokeLinecap="round"
                                stroke={`url(#listGrad-${lot.id})`}
                                fill="transparent"
                                r="20"
                                cx="24"
                                cy="24"
                              />
                            </svg>
                            <span className={cn("text-[11px] font-bold", M.accent)}>{lot.completion_progress}%</span>
                          </div>
                        )}
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors group-hover/lot:bg-white", M.soft)}>
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Output Modal */}
      {dailyOutputOpen && (
        <div
          className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4", dailyOutputClosing ? 'animate-overlay-out' : 'animate-overlay-in')}
          onClick={dismissDailyOutput}
        >
          <div
            className={cn("bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-black/5", dailyOutputClosing ? 'animate-modal-origin-out' : 'animate-modal-origin')}
            data-modal-origin-surface
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={cn("px-6 py-5 flex items-center justify-between", M.headerBg)}>
              <div className="flex items-center gap-4">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg", M.iconBg)}>
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-gray-800">Daily output</h3>
                  <div className="text-sm text-gray-500 mt-0.5">Books transmitted today</div>
                </div>
              </div>
              <button
                onClick={dismissDailyOutput}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white text-gray-500 hover:text-gray-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary cards */}
            {!loadingDailyOutput && dailyOutputRows.length > 0 && (
              <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <div className={cn("flex-1 flex items-center gap-4 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md", TONE.theme.card)}>
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md", TONE.theme.icon)}>
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-[11px] font-bold uppercase tracking-wider mb-0.5", TONE.theme.title)}>Transmitted</span>
                    <span className={cn("text-3xl font-black tracking-tight tabular-nums", TONE.theme.value)}>{totalDailyOutput}</span>
                  </div>
                </div>
                <div className={cn("flex-1 flex items-center gap-4 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md", TONE.theme.card)}>
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md", TONE.theme.icon)}>
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-[11px] font-bold uppercase tracking-wider mb-0.5", TONE.theme.title)}>Total pages</span>
                    <span className={cn("text-3xl font-black tracking-tight tabular-nums", TONE.theme.value)}>
                      {dailyOutputRows.reduce((sum, r) => sum + (r.page_count || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            {loadingDailyOutput ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading daily output...</span>
              </div>
            ) : dailyOutputRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg", M.iconBg)}>
                  <Upload className="h-7 w-7" />
                </div>
                <span className="text-sm font-semibold text-gray-600">No books transmitted today</span>
                <span className="text-xs text-gray-400">Completed transmissions will appear here</span>
              </div>
            ) : (
              <div className="overflow-auto flex-1">
                <table className="min-w-[800px] w-full text-sm">
                  <colgroup>
                    <col className="w-12" />
                    <col className="w-36" />
                    <col />
                    <col className="w-28" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-32" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">#</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">Isbn</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">Title</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">Lot</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">Box</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-gray-500">Pages</th>
                      <th className="text-right py-4 px-6 text-sm font-semibold text-gray-500">
                        <button 
                          onClick={() => {
                            setDailyOutputSort(prev => prev === 'desc' ? 'asc' : 'desc');
                            dailyOutputPagination.goToPage(1);
                          }}
                          className="inline-flex items-center justify-end gap-1 hover:text-gray-800 transition-colors"
                        >
                          {dailyOutputSort === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          Completed
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyOutputRows.map((row, i) => (
                      <tr key={row.isbn} className={cn("transition-colors", M.rowHover)}>
                        <td className="py-4 px-6 text-sm font-medium text-gray-400">{(dailyOutputPagination.currentPage - 1) * dailyOutputPagination.pageSize + i + 1}</td>
                        <td className="py-4 px-6 text-sm font-semibold text-gray-800">{row.isbn}</td>
                        <td className="py-4 px-6 text-sm font-bold text-gray-800 truncate max-w-[360px]">{row.title || '—'}</td>
                        <td className="py-4 px-6">
                          <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap", M.chip)}>{row.lot_number}</span>
                        </td>
                        <td className="py-4 px-6 font-mono text-sm font-bold text-gray-800 whitespace-nowrap">{row.box_number}</td>
                        <td className="py-4 px-6 font-mono text-sm font-medium text-gray-600 text-right whitespace-nowrap">{row.page_count ? row.page_count.toLocaleString() : '—'}</td>
                        <td className="py-4 px-6 text-sm text-gray-500 text-right whitespace-nowrap">
                          {row.completed_at ? new Date(row.completed_at).toLocaleString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {dailyOutputPagination.totalPages > 1 && (
              <div className="border-t border-gray-100 px-4 py-3 shrink-0 bg-white">
                <Pagination
                  currentPage={dailyOutputPagination.currentPage}
                  totalPages={dailyOutputPagination.totalPages}
                  pageSize={dailyOutputPagination.pageSize}
                  onPageChange={dailyOutputPagination.goToPage}
                  onPageSizeChange={dailyOutputPagination.setPageSize}
                  canPrevPage={dailyOutputPagination.canPrevPage}
                  canNextPage={dailyOutputPagination.canNextPage}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
