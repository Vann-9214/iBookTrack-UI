'use client'

import { useState, useEffect, useCallback } from "react"
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""


interface QCFlag {
  scan_id: string
  isbn: string
  title: string | null
  author?: string | null
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
  boxes_count?: number
  books_count?: number
}

interface DailyOutputRow {
  isbn: string
  title: string | null
  author?: string | null
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

  const fetchLiveLots = useCallback(async (background = false) => {
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
      setSelectedLot(prev => {
        if (!prev) return prev;
        const updated = mappedLots.find((ml: any) => ml.id === prev.id)
        return updated || prev;
      })
    } catch {
      setLiveLots([])
    } finally {
      setLoadingLiveLots(false)
    }
  }, [brand])

  const openLiveLots = async () => {
    setLiveLotsOpen(true)
    setSelectedLot(null)
    if (liveLots.length > 0) return
    await fetchLiveLots()
  }

  useEffect(() => {
    if (refreshKey === undefined || !liveLotsOpen) return
    fetchLiveLots(true)
  }, [refreshKey, liveLotsOpen, fetchLiveLots])

  const fetchFlags = useCallback(async (page = 1, background = false) => {
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
  }, [brand])

  const openFlags = async () => {
    setFlagsOpen(true)
    flagsPagination.goToPage(1)
    if (flags.length > 0) return
    await fetchFlags(1)
  }

  const fetchDailyOutput = useCallback(async (page = 1, sort = dailyOutputSort, background = false) => {
    if (!background) setLoadingDailyOutput(true)
    try {
      const res = await authFetch(`${API_URL}/api/dashboard/daily-output?page=${page}&limit=${dailyOutputPagination.pageSize}&brand=${brand}&sort=${sort}`)
      const data = await res.json()
      setDailyOutputRows(data.rows || [])
      setTotalDailyOutput(data.total || 0)
    } catch {
      setDailyOutputRows([])
      setTotalDailyOutput(0)
    } finally {
      setLoadingDailyOutput(false)
    }
  }, [brand, dailyOutputPagination.pageSize])

  const openDailyOutput = async () => {
    setDailyOutputOpen(true)
    dailyOutputPagination.goToPage(1)
    if (dailyOutputRows.length > 0) return
    await fetchDailyOutput(1, 'desc')
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
  }, [refreshKey, flagsOpen, flagsPagination.currentPage, fetchFlags])

  useEffect(() => {
    if (!flagsOpen) return
    fetchFlags(flagsPagination.currentPage)
  }, [flagsPagination.currentPage, flagsOpen, fetchFlags])

  useEffect(() => {
    if (refreshKey === undefined || !dailyOutputOpen) return
    fetchDailyOutput(dailyOutputPagination.currentPage, dailyOutputSort, true)
  }, [refreshKey, dailyOutputOpen, dailyOutputPagination.currentPage, dailyOutputSort, fetchDailyOutput])

  useEffect(() => {
    if (!dailyOutputOpen) return
    fetchDailyOutput(dailyOutputPagination.currentPage, dailyOutputSort)
  }, [dailyOutputPagination.currentPage, dailyOutputSort, dailyOutputOpen, fetchDailyOutput])

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
        chip: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/20",
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
        chip: "bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-sm ring-1 ring-blue-500/20",
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
                className={cn(
                  "rounded-2xl border p-3 flex flex-col shadow-sm ring-1 transition duration-200 overflow-hidden cursor-default",
                  stat.tone.card
                )}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md shrink-0", stat.tone.icon)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div className={cn("text-xl font-black leading-none tracking-tight tabular-nums", stat.tone.value)}>{stat.value}</div>
                </div>
                <div className="flex flex-col min-w-0 mt-auto">
                  <div className={cn("text-[11px] font-semibold truncate leading-tight", stat.tone.title)}>{stat.title}</div>
                  <div className={cn("text-[9px] font-medium truncate opacity-90", stat.tone.sub)}>{stat.subtext}</div>
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
                  "group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-xl",
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
          <div className={cn("bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-black/5", flagsClosing ? 'animate-modal-origin-out' : 'animate-modal-origin')} data-modal-origin-surface onClick={e => e.stopPropagation()}>

            {/* Premium Gradient Header */}
            <div className="px-6 py-5 flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-100 border-b border-red-100/50">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-rose-600 text-white shadow-lg shadow-red-500/30 ring-1 ring-white/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-red-950 to-red-800 bg-clip-text text-transparent tracking-tight">Non-Processable Books</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-red-500 to-rose-500 shadow-sm shadow-red-500/50"></span>
                    </span>
                    <p className="text-sm font-medium text-red-700/80">Needs review before transmission</p>
                  </div>
                </div>
              </div>
              <button onClick={dismissFlags} className="rounded-full p-2.5 bg-white/50 hover:bg-white text-red-500 shadow-sm transition hover:shadow hover:scale-105">
                <X className="h-5 w-5" />
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
              <div className="overflow-y-auto flex-1 px-6 pb-4">
                <table className="w-full text-sm text-left border-collapse">
                  <colgroup>
                    <col className="w-12" />
                    <col className="w-32" />
                    <col />
                    <col className="w-40" />
                    <col className="w-32" />
                    <col className="w-48" />
                    <col className="w-40" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                    <tr>
                      <th className="py-2 px-2 text-sm font-semibold text-gray-500">#</th>
                      <th className="py-2 px-2 text-sm font-semibold text-gray-500">Isbn</th>
                      <th className="hidden sm:table-cell py-2 px-2 text-sm font-semibold text-gray-500">Title</th>
                      <th className="hidden sm:table-cell py-2 px-2 text-sm font-semibold text-gray-500">Author</th>
                      <th className="py-2 px-2 text-sm font-semibold text-gray-500 whitespace-nowrap">Lot &amp; box</th>
                      <th className="py-2 px-2 text-sm font-semibold text-gray-500">Issue</th>
                      <th className="py-2 px-2 text-sm font-semibold text-gray-500">Flagged by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {flags.map((f, i) => (
                      <tr key={f.scan_id} className="hover:bg-gradient-to-r hover:from-red-50/50 hover:to-transparent transition-colors align-middle">
                        <td className="py-2 px-2 text-sm font-medium text-gray-400">{(flagsPagination.currentPage - 1) * flagsPagination.pageSize + i + 1}</td>
                        <td className="py-2 px-2 text-sm text-gray-600">{f.isbn}</td>
                        <td className="hidden sm:table-cell py-2 px-2 text-sm font-bold text-gray-800">
                          <span className="line-clamp-2 max-w-[500px]" title={f.title || ''}>{f.title || '—'}</span>
                        </td>
                        <td className="hidden sm:table-cell py-2 px-2 text-sm text-gray-600">
                          <span className="line-clamp-2 max-w-[350px]" title={f.author || ''}>{f.author || '—'}</span>
                        </td>
                        <td className="py-2 px-2 text-sm whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white px-2.5 py-0.5 text-xs font-semibold ring-1 ring-blue-500/20 shadow-sm">
                            {f.assigned_box?.lot?.lot_number ? f.assigned_box.lot.lot_number : '—'}
                          </span>
                          {f.assigned_box?.box_number && (
                            <span className="ml-1.5 text-gray-400 font-medium">{f.assigned_box.box_number}</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-gradient-to-br from-red-400 to-rose-600 text-white px-2.5 py-1 text-xs font-semibold ring-1 ring-red-500/20 shadow-sm">
                              {ISSUE_LABELS[f.issue] || f.issue}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center min-w-0">
                            <span className="truncate text-gray-800 font-bold text-sm">{f.flagged_by_name || '—'}</span>
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white text-gray-500 hover:text-gray-800 transition"
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
                    <div key={label} className={cn("rounded-2xl p-5 flex flex-col justify-between shadow-sm transition hover:shadow-md", TONE.theme.card)}>
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white mb-4", TONE.theme.icon)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className={cn("text-[11px] font-bold uppercase tracking-wider mb-0.5", TONE.theme.title)}>{label}</p>
                        <p className={cn("text-3xl font-black tracking-tight tabular-nums", TONE.theme.value)}>{value}</p>
                      </div>
                    </div>
                  ))}

                  <div className={cn("col-span-2 rounded-2xl p-6 shadow-sm flex items-center gap-6 transition hover:shadow-md", TONE.theme.card)}>
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
                      className={cn("group/lot w-full flex items-center gap-3 rounded-xl border border-transparent bg-gradient-to-r from-gray-50/80 to-white px-2 py-2 text-left transition hover:shadow-sm hover:from-white hover:to-gray-50", M.rowHover)}
                    >
                      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover/lot:scale-105 ring-1 ring-white/20", M.iconBg)}>
                        <Package className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className={cn("text-[15px] font-bold truncate", M.accent)}>{lot.lot_number}</h4>
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-white shadow-sm", isCompleted ? "bg-gradient-to-r from-green-400 to-green-600" : M.bar)}>
                            {isCompleted ? 'Completed' : lot.status}
                          </span>
                        </div>
                        <div className={cn("flex items-center gap-2.5 text-[12px] font-semibold", M.soft)}>
                          <span>{lot.boxes_count || lot.total_boxes} boxes</span>
                          <span className="text-gray-300">•</span>
                          <span>{lot.books_count || lot.total_books} books</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 pr-1">
                        {isCompleted ? (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-sm shadow-green-500/20">
                            <Check className="h-5 w-5 text-white" strokeWidth={3.5} />
                          </div>
                        ) : (
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                            <svg className="absolute inset-0 h-10 w-10 -rotate-90 drop-shadow-sm" viewBox="0 0 40 40">
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
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="transparent"
                                r="16"
                                cx="20"
                                cy="20"
                              />
                              <circle
                                strokeWidth="3.5"
                                strokeDasharray={100.53}
                                strokeDashoffset={100.53 - (100.53 * (lot.completion_progress || 0)) / 100}
                                strokeLinecap="round"
                                stroke={`url(#listGrad-${lot.id})`}
                                fill="transparent"
                                r="16"
                                cx="20"
                                cy="20"
                              />
                            </svg>
                            <span className={cn("text-[10px] font-bold", M.accent)}>{lot.completion_progress || 0}%</span>
                          </div>
                        )}
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover/lot:scale-110", M.soft)}>
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
            className={cn("bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-black/5", dailyOutputClosing ? 'animate-modal-origin-out' : 'animate-modal-origin')}
            data-modal-origin-surface
            onClick={(e) => e.stopPropagation()}
          >
            {/* Premium Gradient Header */}
            <div className={cn("px-6 py-5 flex items-center justify-between border-b border-gray-100", M.headerBg)}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ring-1 ring-white/20", M.iconBg)}>
                  <FileOutput className="h-6 w-6" />
                </div>
                <div>
                  <h2 className={cn("text-xl font-bold tracking-tight bg-clip-text text-transparent", M.bar)}>Daily Output</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-2 w-2">
                      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", M.dot)}></span>
                      <span className={cn("relative inline-flex rounded-full h-2 w-2 shadow-sm", M.dot)}></span>
                    </span>
                    <p className={cn("text-sm font-semibold", M.soft)}>{dailyOutput.toLocaleString()} books transmitted today</p>
                  </div>
                </div>
              </div>
              <button onClick={dismissDailyOutput} className={cn("rounded-full p-2.5 bg-white/50 shadow-sm hover:shadow hover:scale-105 hover:bg-white transition", M.soft)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary cards */}
            {!loadingDailyOutput && dailyOutputRows.length > 0 && (
              <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <div className={cn("flex-1 flex items-center gap-4 rounded-2xl p-5 shadow-sm transition hover:shadow-md", TONE.theme.card)}>
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md", TONE.theme.icon)}>
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-[11px] font-bold uppercase tracking-wider mb-0.5", TONE.theme.title)}>Transmitted</span>
                    <span className={cn("text-3xl font-black tracking-tight tabular-nums", TONE.theme.value)}>{totalDailyOutput}</span>
                  </div>
                </div>
                <div className={cn("flex-1 flex items-center gap-4 rounded-2xl p-5 shadow-sm transition hover:shadow-md", TONE.theme.card)}>
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
              <div className="flex-1 w-full min-h-0 overflow-y-auto">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-12" />
                    <col className="w-44" />
                    <col />
                    <col className="w-40" />
                    <col className="w-28" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-32" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                    <tr>
                      <th className="text-left py-2 px-6 text-sm font-semibold text-gray-500">#</th>
                      <th className="text-left py-2 px-6 text-sm font-semibold text-gray-500">Isbn</th>
                      <th className="text-left py-2 px-6 text-sm font-semibold text-gray-500">Title</th>
                      <th className="text-left py-2 px-6 text-sm font-semibold text-gray-500">Author</th>
                      <th className="text-left py-2 px-6 text-sm font-semibold text-gray-500">Lot</th>
                      <th className="text-left py-2 px-6 text-sm font-semibold text-gray-500">Box</th>
                      <th className="text-right py-2 px-6 text-sm font-semibold text-gray-500">Pages</th>
                      <th className="text-right py-2 px-6 text-sm font-semibold text-gray-500">
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
                        <td className="py-2 px-6 text-sm font-medium text-gray-400 truncate">{(dailyOutputPagination.currentPage - 1) * dailyOutputPagination.pageSize + i + 1}</td>
                        <td className="py-2 px-6 text-sm font-semibold text-gray-800 truncate">{row.isbn}</td>
                        <td className="py-2 px-6 text-sm font-bold text-gray-800 truncate" title={row.title || ''}>{row.title || '—'}</td>
                        <td className="py-2 px-6 text-sm text-gray-600 truncate" title={row.author || ''}>{row.author || '—'}</td>
                        <td className="py-2 px-6">
                          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-black/5 shadow-sm", M.chip)}>{row.lot_number}</span>
                        </td>
                        <td className="py-2 px-6 font-mono text-sm font-bold text-gray-800 whitespace-nowrap">{row.box_number}</td>
                        <td className="py-2 px-6 font-mono text-sm font-medium text-gray-600 text-right whitespace-nowrap">{row.page_count ? row.page_count.toLocaleString() : '—'}</td>
                        <td className="py-2 px-6 text-sm text-gray-500 text-right whitespace-nowrap">
                          {row.completed_at ? new Date(row.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
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
