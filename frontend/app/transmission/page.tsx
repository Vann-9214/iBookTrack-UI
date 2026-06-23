"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { usePagination } from "@/hooks/usePagination"
import { Pagination } from "@/components/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileUp,
  CheckCircle2,
  XCircle,
  Activity,
  Search,
  Loader2,
  RefreshCw,
  Trophy,
  Download,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

function getStatusBadge(status: string) {
  if (status === 'COMPLETED') return (
    <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-[10px]">
      <CheckCircle2 className="h-3 w-3" /> Completed
    </Badge>
  )
  if (status === 'FAILED') return (
    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[10px]">
      <XCircle className="h-3 w-3" /> Failed
    </Badge>
  )
  return (
    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary gap-1 text-[10px]">
      <Loader2 className="h-3 w-3 animate-spin" /> Ongoing
    </Badge>
  )
}


const todayStr = () => new Date().toISOString().split('T')[0]

export default function TransmissionMonitorPage() {
  const [historySearch, setHistorySearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [byMachine, setByMachine] = useState<any[]>([])
  const [showRanking, setShowRanking] = useState(false)
  const [ranking, setRanking] = useState<any>(null)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [fromDate, setFromDate] = useState(todayStr())
  const [toDate, setToDate] = useState(todayStr())

  // Pagination for by machine table
  const machinesPagination = usePagination({ totalItems: byMachine.length, defaultPageSize: 50 })
  const paginatedByMachine = byMachine.slice(machinesPagination.offset, machinesPagination.offset + machinesPagination.limit)

  const fetchLiveData = useCallback(async (from?: string, to?: string) => {
    setLoading(true)
    try {
      const f = from || fromDate
      const t = to || toDate
      const res = await fetch(`${API_URL}/api/scanning/live?from=${f}&to=${t}`)
      const data = await res.json()
      if (data.success) {
        setSummary(data.summary)
        setStages(data.byStage || [])
        setRecentScans(data.recentScans || [])
        setByMachine(data.byMachine || [])
        setLastUpdated(new Date())
      }
    } catch (e) {
      console.error('Failed to fetch live scanning data:', e)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  const fetchRanking = async () => {
    setRankingLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/scanning/ranking`)
      const data = await res.json()
      if (data.success) setRanking(data)
    } catch (e) {
      console.error('Failed to fetch ranking:', e)
    } finally {
      setRankingLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${API_URL}/api/scanning/export?date=${fromDate}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scanning-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  const handleOpenRanking = () => {
    setShowRanking(true)
    fetchRanking()
  }

  const handleSearch = () => {
    fetchLiveData(fromDate, toDate)
  }

  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(() => fetchLiveData(), 60000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const transmissionStage = stages.find(s => s.Stage === 'Transmission_Archive')
  const totalTransmitted = transmissionStage?.Completed || 0
  const ongoingTransmissions = transmissionStage?.Ongoing || 0
  const failedTransmissions = summary?.Failed || 0
  const passRate = totalTransmitted + failedTransmissions > 0
    ? ((totalTransmitted / (totalTransmitted + failedTransmissions)) * 100).toFixed(1)
    : '100.0'

  const filteredScans = recentScans.filter((item: any) =>
    !historySearch || item.ISBN?.toLowerCase().includes(historySearch.toLowerCase()) ||
    item.BoxNumber?.toLowerCase().includes(historySearch.toLowerCase())
  )

  // Update pagination total when filters change
  const recentScansPagination = usePagination({ totalItems: filteredScans.length, defaultPageSize: 50 })
  const paginatedRecentScans = filteredScans.slice(recentScansPagination.offset, recentScansPagination.offset + recentScansPagination.limit)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Header */}
            <header className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Transmission Monitor
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live scanning data from Simflex WMS — updates every 60 seconds.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="h-8 w-36 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="h-8 w-36 text-xs"
                  />
                </div>
                <Button size="sm" onClick={handleSearch} disabled={loading} className="h-8 gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Search
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenRanking} className="gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  Ranking
                </Button>
                <Button variant="outline" size="sm" onClick={() => fetchLiveData()} disabled={loading} className="gap-1.5">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </header>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transmitted Today</p>
                      <p className="text-2xl font-bold text-card-foreground">
                        {loading ? '...' : totalTransmitted.toLocaleString()}
                      </p>
                      {ongoingTransmissions > 0 && (
                        <p className="text-xs text-primary mt-0.5">{ongoingTransmissions} in progress</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pass Rate</p>
                      <p className="text-2xl font-bold text-card-foreground">
                        {loading ? '...' : `${passRate}%`}
                      </p>
                      {failedTransmissions > 0 && (
                        <p className="text-xs text-destructive mt-0.5">{failedTransmissions} failed</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                      <Activity className="h-6 w-6 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Books Today</p>
                      <p className="text-2xl font-bold text-card-foreground">
                        {loading ? '...' : (summary?.TotalScans || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{summary?.Ongoing || 0} ongoing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stage breakdown */}
            {stages.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {stages.map((s: any) => (
                  <Card key={s.Stage} className="border-border bg-card">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted-foreground truncate">{s.Stage}</p>
                      <p className="text-xl font-bold text-card-foreground mt-1">{s.Total.toLocaleString()}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-success">✓ {s.Completed}</span>
                          <span className="text-primary">↻ {s.Ongoing}</span>
                          {s.Failed > 0 && <span className="text-destructive">✗ {s.Failed}</span>}
                        </div>
                        <Progress value={s.Total > 0 ? (s.Completed / s.Total) * 100 : 0} className="h-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="queue" className="w-full">
              <TabsList>
                <TabsTrigger value="queue">Live Scan Feed</TabsTrigger>
                <TabsTrigger value="machine">By Machine</TabsTrigger>
              </TabsList>

              <TabsContent value="queue" className="mt-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-card-foreground">
                        {fromDate === toDate ? `Recent Scans — ${fromDate}` : `Recent Scans — ${fromDate} to ${toDate}`}
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search ISBN or Box..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="w-56 pl-9 h-8 text-sm"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-xs text-muted-foreground font-medium">Scan Date</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">Scan User</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">Box</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">ISBN</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium text-right">Pages</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">Machine</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium text-right">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                              Loading live data...
                            </TableCell>
                          </TableRow>
                        ) : paginatedRecentScans.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No scans found
                            </TableCell>
                          </TableRow>
                        ) : paginatedRecentScans.map((item: any, i: number) => {
                          const statusWord = item.Status?.split(' ').pop() || 'ONGOING'
                          return (
                            <TableRow key={i} className="border-border">
                              <TableCell className="text-xs text-muted-foreground">
                                {item.ScanDate ? new Date(item.ScanDate).toLocaleDateString() : '—'}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-card-foreground">{item.ScanUser || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.BoxNumber || '—'}</TableCell>
                              <TableCell className="font-mono text-xs text-card-foreground">{item.ISBN}</TableCell>
                              <TableCell className="text-xs text-right font-semibold text-card-foreground">{item.PageCount ?? '—'}</TableCell>
                              <TableCell>{getStatusBadge(statusWord)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.MachineName || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground text-right">
                                {item.Updated ? new Date(item.Updated).toLocaleTimeString() : '—'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    {filteredScans.length > 0 && recentScansPagination.totalPages > 1 && (
                      <Pagination
                        currentPage={recentScansPagination.currentPage}
                        totalPages={recentScansPagination.totalPages}
                        pageSize={recentScansPagination.pageSize}
                        onPageChange={recentScansPagination.goToPage}
                        onPageSizeChange={recentScansPagination.setPageSize}
                        canPrevPage={recentScansPagination.canPrevPage}
                        canNextPage={recentScansPagination.canNextPage}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="machine" className="mt-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-card-foreground">
                      {fromDate === toDate ? `Scans by Machine — ${fromDate}` : `Scans by Machine — ${fromDate} to ${toDate}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-xs text-muted-foreground font-medium">Machine Name</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">Machine ID</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">User</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium w-48">Activity</TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium text-right">Total Scans</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : byMachine.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No machine data for today</TableCell>
                          </TableRow>
                        ) : paginatedByMachine.map((m: any, i: number) => {
                          const maxScans = byMachine[0]?.TotalScans || 1
                          return (
                            <TableRow key={i} className="border-border">
                              <TableCell className="font-mono text-xs text-card-foreground">{m.MachineName}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{m.MachineID}</TableCell>
                              <TableCell className="text-xs text-card-foreground">{m.User}</TableCell>
                              <TableCell>
                                <Progress value={(m.TotalScans / maxScans) * 100} className="h-2" />
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-right text-card-foreground">
                                {m.TotalScans.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    {byMachine.length > 0 && machinesPagination.totalPages > 1 && (
                      <Pagination
                        currentPage={machinesPagination.currentPage}
                        totalPages={machinesPagination.totalPages}
                        pageSize={machinesPagination.pageSize}
                        onPageChange={machinesPagination.goToPage}
                        onPageSizeChange={machinesPagination.setPageSize}
                        canPrevPage={machinesPagination.canPrevPage}
                        canNextPage={machinesPagination.canNextPage}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </main>
      {/* Ranking Modal */}
      {showRanking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRanking(false)}>
        <div className="bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '90vw', maxWidth: 1100, height: '90vh' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Trophy className="h-5 w-5 text-amber-500" />
              Performance Ranking — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={() => setShowRanking(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col p-6 gap-5">
          {rankingLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ranking ? (
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Total Books</p>
                  <p className="text-3xl font-bold mt-1">{ranking.totalBooks.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Total Pages</p>
                  <p className="text-3xl font-bold mt-1">{ranking.totalPages.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Highest Output</p>
                  <p className="text-3xl font-bold text-amber-500 mt-1">{ranking.highestOutput}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Avg Output/User</p>
                  <p className="text-3xl font-bold mt-1">{ranking.avgOutput}</p>
                </div>
              </div>

              <div className="flex gap-6 overflow-hidden flex-1 min-h-0">
                {/* Table */}
                <ScrollArea className="flex-1 rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-sm font-semibold w-14">Rank</TableHead>
                        <TableHead className="text-sm font-semibold">User</TableHead>
                        <TableHead className="text-sm font-semibold text-right">Books</TableHead>
                        <TableHead className="text-sm font-semibold text-right">Pages</TableHead>
                        <TableHead className="text-sm font-semibold w-44">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ranking.data.map((r: any) => {
                        const pct = r.ScoreNum
                        const color = pct >= 81 ? 'bg-success' : pct >= 51 ? 'bg-amber-500' : 'bg-destructive'
                        return (
                          <TableRow key={r.Rank} className={`border-border ${r.Rank <= 3 ? 'bg-amber-500/5' : ''}`}>
                            <TableCell className="text-sm font-bold">
                              {r.Rank <= 3 ? (
                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${r.Rank === 1 ? 'bg-amber-400' : r.Rank === 2 ? 'bg-slate-400' : 'bg-amber-700'}`}>{r.Rank}</span>
                              ) : r.Rank}
                            </TableCell>
                            <TableCell className="text-sm font-medium">{r.ScanUser}</TableCell>
                            <TableCell className="text-sm text-right font-semibold">{r.Books}</TableCell>
                            <TableCell className="text-sm text-right text-muted-foreground">{r.Pages.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-10 text-right font-medium">{Math.round(pct)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Score Distribution Bar Chart */}
                <div className="w-80 flex flex-col min-h-0">
                  <p className="text-sm text-muted-foreground mb-2 font-semibold">Score Distribution</p>
                  <div className="flex-1 min-h-0">
                  {(() => {
                    const buckets = [
                      { label: 'Below 50%', min: 0,  max: 50  },
                      { label: '51–60%',    min: 51, max: 60  },
                      { label: '61–70%',    min: 61, max: 70  },
                      { label: '71–80%',    min: 71, max: 80  },
                      { label: '81–90%',    min: 81, max: 90  },
                      { label: '91–95%',    min: 91, max: 95  },
                      { label: '96–99%',    min: 96, max: 99  },
                      { label: '100%',      min: 100,max: 100 },
                    ]
                    const bucketColors = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#6366f1']
                    const chartData = buckets.map((b, i) => ({
                      label: b.label,
                      users: ranking.data.filter((r: any) => r.ScoreNum >= b.min && r.ScoreNum <= b.max).length,
                      color: bucketColors[i],
                    }))
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 0, right: 28, bottom: 0, left: 8 }}
                        >
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 'dataMax']}
                          />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={72}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            formatter={(v: any) => [`${v} user${v !== 1 ? 's' : ''}`, 'Count']}
                          />
                          <Bar dataKey="users" radius={[0, 4, 4, 0]} maxBarSize={36}>
                            {chartData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
