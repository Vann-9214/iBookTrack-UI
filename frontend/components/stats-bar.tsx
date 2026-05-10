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

  const stats = [
    {
      title: "Live Lots",
      value: dashboardStats?.activeLots?.toString() || "0",
      subtext: "Active in 8-step pipeline",
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: undefined,
    },
    {
      title: "Non-Processable Books",
      value: dashboardStats?.unaccountedBooks?.toString() || "0",
      subtext: "Flagged / Non-Processable",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      onClick: openFlags,
    },
    {
      title: "Daily Output",
      value: dashboardStats?.dailyTransmitted?.toString() || "0",
      subtext: "Successfully transmitted",
      icon: FileOutput,
      color: "text-success",
      bgColor: "bg-success/10",
      unit: "Books",
      onClick: undefined,
    },
    {
      title: "Total Books",
      value: dashboardStats?.totalBooks?.toString() || "0",
      subtext: "In system",
      icon: HeartPulse,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: undefined,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            onClick={stat.onClick}
            className={cn("border-border bg-card hover:border-primary/30 transition-colors", stat.onClick ? "cursor-pointer" : "")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", stat.bgColor)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("text-2xl font-bold", stat.color)}>
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {stat.unit}
                    </span>
                  )}
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {stat.subtext}
                </span>
              </div>
            </CardContent>
          </Card>
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
