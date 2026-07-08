'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock, Package, BookOpen, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/auth-api'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

type ComputedStatus = 'closed' | 'open' | 'in-progress'

interface LotStatusRow {
  lot_id: string
  lot_number: string
  lot_status: string
  computed_status: ComputedStatus
  created_at: string
  total_boxes: number
  active_boxes: number
  stored_boxes: number
  total_scans: number
  transmitted: number
  non_processable: number
  pending: number
}

type FilterStatus = 'all' | ComputedStatus
type SortKey = 'lot_number' | 'computed_status' | 'total_boxes' | 'transmitted' | 'pending' | 'progress'
type SortDir = 'asc' | 'desc'

const STATUS_META: Record<ComputedStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  closed:      { label: 'Closed',      color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  open:        { label: 'Open',        color: 'text-amber-700 dark:text-amber-400',    bg: 'bg-amber-100 dark:bg-amber-900/30',    icon: AlertCircle },
  'in-progress': { label: 'In-Progress', color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/30',      icon: Clock },
}

export default function ReportsPage() {
  const [lots, setLots] = useState<LotStatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timestamp, setTimestamp] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [sortKey, setSortKey] = useState<SortKey>('progress')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`${API_URL}/api/reports/lot-status`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setLots(data.lots || [])
      setTimestamp(new Date().toLocaleString())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const counts = {
    all: lots.length,
    closed: lots.filter(l => l.computed_status === 'closed').length,
    open: lots.filter(l => l.computed_status === 'open').length,
    'in-progress': lots.filter(l => l.computed_status === 'in-progress').length,
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = lots
    .filter(l => filter === 'all' || l.computed_status === filter)
    .filter(l => !search || l.lot_number.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av: string | number
      let bv: string | number
      if (sortKey === 'progress') {
        av = a.total_scans > 0 ? a.transmitted / a.total_scans : 0
        bv = b.total_scans > 0 ? b.transmitted / b.total_scans : 0
      } else {
        av = a[sortKey] ?? ''
        bv = b[sortKey] ?? ''
        if (typeof av === 'string' && typeof bv === 'string') {
          av = av.toLowerCase(); bv = bv.toLowerCase()
        }
      }
      return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0)
    })

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="h-3 w-3 opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  const thCls = (k: SortKey) =>
    cn('px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors',
      sortKey === k && 'text-foreground')

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">

          {/* Header */}
          <header className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">LOT Status Report</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time movement and completion status of all lots
                {timestamp && <span className="ml-2">· Updated {timestamp}</span>}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-1.5 hidden sm:flex"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </header>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['all', 'closed', 'open', 'in-progress'] as FilterStatus[]).map(s => {
              const meta = s === 'all' ? null : STATUS_META[s]
              const Icon = meta?.icon
              const count = counts[s]
              const active = filter === s
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    'flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all',
                    active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    {Icon && <Icon className={cn('h-4 w-4', meta?.color)} />}
                    <span className={cn('text-xs font-semibold uppercase tracking-wider', meta?.color ?? 'text-muted-foreground')}>
                      {s === 'all' ? 'All Lots' : STATUS_META[s].label}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Filter & Search bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search lot number…"
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-52"
            />
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              {(['all', 'closed', 'open', 'in-progress'] as FilterStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    filter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'all' ? 'All' : STATUS_META[s as ComputedStatus].label}
                  <span className="ml-1.5 opacity-70">{counts[s]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading lot statuses…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <p className="font-medium text-destructive">Failed to load</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              No lots match the current filter.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className={thCls('lot_number')} onClick={() => handleSort('lot_number')}>
                        <span className="flex items-center gap-1">Lot Number <SortIcon k="lot_number" /></span>
                      </th>
                      <th className={thCls('computed_status')} onClick={() => handleSort('computed_status')}>
                        <span className="flex items-center gap-1">Status <SortIcon k="computed_status" /></span>
                      </th>
                      <th className={thCls('total_boxes')} onClick={() => handleSort('total_boxes')}>
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" />Boxes <SortIcon k="total_boxes" /></span>
                      </th>
                      <th className={thCls('transmitted')} onClick={() => handleSort('transmitted')}>
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />Transmitted <SortIcon k="transmitted" /></span>
                      </th>
                      <th className={thCls('pending')} onClick={() => handleSort('pending')}>
                        <span className="flex items-center gap-1">Pending <SortIcon k="pending" /></span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Non-Processable</th>
                      <th className={thCls('progress')} onClick={() => handleSort('progress')}>
                        <span className="flex items-center gap-1">Progress <SortIcon k="progress" /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(lot => {
                      const meta = STATUS_META[lot.computed_status]
                      const Icon = meta.icon
                      const pct = lot.total_scans > 0 ? Math.round((lot.transmitted / lot.total_scans) * 100) : 0
                      return (
                        <tr key={lot.lot_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{lot.lot_number}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', meta.bg, meta.color)}>
                              <Icon className="h-3.5 w-3.5" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span title={`${lot.active_boxes} active, ${lot.stored_boxes} stored`}>
                              {lot.total_boxes}
                              {lot.active_boxes > 0 && (
                                <span className="ml-1 text-[10px] text-blue-500">({lot.active_boxes} active)</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">{lot.transmitted}</td>
                          <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-medium">{lot.pending}</td>
                          <td className="px-4 py-3 text-muted-foreground">{lot.non_processable}</td>
                          <td className="px-4 py-3 min-w-[140px]">
                            {lot.total_scans > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500')}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-9 text-right">{pct}%</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No scans</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                Showing {filtered.length} of {lots.length} lots
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
