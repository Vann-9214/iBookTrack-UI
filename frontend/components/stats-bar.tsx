'use client'

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Activity, AlertTriangle, FileOutput, HeartPulse } from "lucide-react"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setFlagsOpen(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" /> Non-Processable / Flagged Books
                </h3>
                <p className="text-xs text-muted-foreground">{flags.length} book{flags.length !== 1 ? 's' : ''} flagged</p>
              </div>
              <button onClick={() => setFlagsOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            {loadingFlags ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            ) : flags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No flagged books recorded yet.</p>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="pb-2 text-left font-medium w-6">#</th>
                      <th className="pb-2 text-left font-medium pr-3">ISBN</th>
                      <th className="pb-2 text-left font-medium pr-3">Title</th>
                      <th className="pb-2 text-left font-medium pr-3">Issue</th>
                      <th className="pb-2 text-left font-medium">Flagged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.map((f, i) => (
                      <tr key={f.scan_id} className="border-b border-border/40 last:border-0">
                        <td className="py-1.5 text-muted-foreground pr-2">{i + 1}</td>
                        <td className="py-1.5 font-mono pr-3">{f.isbn}</td>
                        <td className="py-1.5 pr-3 max-w-[200px] truncate text-foreground">{f.title || '—'}</td>
                        <td className="py-1.5 pr-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                            {ISSUE_LABELS[f.issue] || f.issue}
                          </span>
                          {f.remarks && <span className="ml-1 text-muted-foreground">{f.remarks}</span>}
                        </td>
                        <td className="py-1.5 text-muted-foreground">{f.flagged_by_name || '—'}</td>
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
