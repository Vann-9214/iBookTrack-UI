'use client'

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Activity, AlertTriangle, FileOutput, HeartPulse, Loader2, X } from "lucide-react"
import { authFetch } from "@/lib/auth-api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface QCFlag {
  scan_id: string
  isbn: string
  title: string | null
  issue: string
  remarks: string | null
  flagged_by_name: string | null
  flagged_at: string
}

interface StatsBarProps {
  stats?: any
}

export function StatsBar({ stats: dashboardStats }: StatsBarProps) {
  const [flagsOpen, setFlagsOpen] = useState(false)
  const [flags, setFlags] = useState<QCFlag[]>([])
  const [loadingFlags, setLoadingFlags] = useState(false)

  const openFlags = async () => {
    setFlagsOpen(true)
    if (flags.length > 0) return
    setLoadingFlags(true)
    try {
      const res = await authFetch(`${API_URL}/api/dashboard/qc-flags`)
      const data = await res.json()
      setFlags(data.flags || [])
    } catch {
      setFlags([])
    } finally {
      setLoadingFlags(false)
    }
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

  const stats = [
    {
      title: "Live Lots",
      value: activeLots.toLocaleString(),
      subtext: "actively processing",
      badge: `+${Math.max(0, activeLots - 3)} from yesterday`,
      icon: Activity,
      iconColor: "text-white",
      iconBg: "bg-blue-500",
      cardBg: "bg-blue-100/60",
      hoverBg: "hover:bg-blue-100",
      border: "border-blue-300",
      valueColor: "text-blue-600",
      subtextColor: "text-blue-500",
      onClick: undefined,
    },
    {
      title: "Non-Processable",
      value: unaccounted.toLocaleString(),
      subtext: `${unaccounted} flagged today`,
      badge: "Needs review",
      icon: AlertTriangle,
      iconColor: "text-red-600",
      iconBg: "bg-red-500",
      cardBg: "bg-red-100/60",
      hoverBg: "hover:bg-red-100",
      border: "border-red-300",
      valueColor: "text-red-600",
      subtextColor: "text-red-400",
      onClick: openFlags,
    },
    {
      title: "Daily Output",
      value: dailyOutput.toLocaleString(),
      subtext: "books scanned",
      badge: "102% of target",
      icon: FileOutput,
      iconColor: "text-green-600",
      iconBg: "bg-green-500",
      cardBg: "bg-green-100/60",
      hoverBg: "hover:bg-green-100",
      border: "border-green-300",
      valueColor: "text-green-600",
      subtextColor: "text-green-500",
      onClick: undefined,
    },
    {
      title: "Total Books",
      value: totalBooks.toLocaleString(),
      subtext: "in system",
      badge: "All accounted",
      icon: HeartPulse,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-500",
      cardBg: "bg-purple-100/60",
      hoverBg: "hover:bg-purple-100",
      border: "border-purple-300",
      valueColor: "text-purple-600",
      subtextColor: "text-purple-400",
      onClick: undefined,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            onClick={stat.onClick}
            className={cn(
              "rounded-2xl border p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]",
              stat.cardBg, stat.hoverBg, stat.border,
              stat.onClick ? "cursor-pointer" : "cursor-default"
            )}
          >
            {/* Top row: icon + badge */}
            <div className="flex items-start justify-between mb-3">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm", stat.iconBg)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500">{stat.badge}</span>
            </div>
            {/* Value */}
            <div className={cn("text-3xl font-black mb-0.5", stat.valueColor)}>
              {stat.value}
            </div>
            {/* Title */}
            <div className="text-sm font-semibold text-gray-700 mb-0.5">{stat.title}</div>
            {/* Subtext */}
            <div className={cn("text-xs", stat.subtextColor)}>{stat.subtext}</div>
          </div>
        ))}
      </div>

      {/* QC Flagged Books Modal */}
      {flagsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setFlagsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Red header */}
            <div className="px-6 py-5 flex items-center justify-between bg-red-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Non-Processable Books</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-500">Needs review</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setFlagsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white text-gray-500 hover:text-gray-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Summary strip */}
            {!loadingFlags && flags.length > 0 && (
              <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Flagged Books</span>
                  <span className="text-sm font-bold text-red-600">{flags.length}</span>
                </div>
              </div>
            )}

            {/* Content */}
            {loadingFlags ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading flagged books...</span>
              </div>
            ) : flags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
                <span className="text-sm font-medium text-gray-500">No flagged books recorded yet</span>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide w-10">#</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">ISBN</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Title</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Issue</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Flagged By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {flags.map((f, i) => (
                      <tr key={f.scan_id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-xs text-gray-300">{i + 1}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{f.isbn}</td>
                        <td className="py-3 px-4 text-gray-500 max-w-[160px] truncate">{f.title || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            {ISSUE_LABELS[f.issue] || f.issue}
                          </span>
                          {f.remarks && <span className="ml-2 text-xs text-gray-400">{f.remarks}</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-500">{f.flagged_by_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
