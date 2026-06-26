"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { usePagination } from "@/hooks/usePagination"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
  Calendar as CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
  const [machineSearch, setMachineSearch] = useState("")
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
  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)

  // Pagination for by machine table
  const filteredByMachine = byMachine.filter((m: any) =>
    !machineSearch ||
    m.MachineName?.toLowerCase().includes(machineSearch.toLowerCase()) ||
    m.User?.toLowerCase().includes(machineSearch.toLowerCase()) ||
    m.MachineID?.toLowerCase().includes(machineSearch.toLowerCase())
  )
  const machinesPagination = usePagination({ totalItems: filteredByMachine.length, defaultPageSize: 50 })
  const paginatedByMachine = filteredByMachine.slice(machinesPagination.offset, machinesPagination.offset + machinesPagination.limit)

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
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
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
                  <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-8 w-36 justify-start text-left font-normal text-xs"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {fromDate ? format(new Date(fromDate), 'MMM dd, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate ? new Date(fromDate) : undefined}
                        onSelect={date => { setFromDate(date ? format(date, 'yyyy-MM-dd') : ''); setFromDateOpen(false) }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-8 w-36 justify-start text-left font-normal text-xs"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {toDate ? format(new Date(toDate), 'MMM dd, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate ? new Date(toDate) : undefined}
                        onSelect={date => { setToDate(date ? format(date, 'yyyy-MM-dd') : ''); setToDateOpen(false) }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
              {/* Transmitted Today */}
              <div className="rounded-2xl border border-blue-300 bg-blue-100/60 hover:bg-blue-100 p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-sm">
                    <FileUp className="h-6 w-6" />
                  </div>
                  {ongoingTransmissions > 0 && (
                    <span className="text-[11px] font-semibold text-blue-600">{ongoingTransmissions} in progress</span>
                  )}
                </div>
                <div className="text-3xl font-black text-blue-600 mb-0.5">
                  {loading ? '…' : totalTransmitted.toLocaleString()}
                </div>
                <div className="text-sm font-semibold text-gray-700 mb-0.5">Transmitted Today</div>
                <div className="text-xs text-blue-500">books sent to archive</div>
              </div>

              {/* Pass Rate */}
              <div className="rounded-2xl border border-green-300 bg-green-100/60 hover:bg-green-100 p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 text-white shadow-sm">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  {failedTransmissions > 0 && (
                    <span className="text-[11px] font-semibold text-red-500">{failedTransmissions} failed</span>
                  )}
                </div>
                <div className="text-3xl font-black text-green-600 mb-0.5">
                  {loading ? '…' : `${passRate}%`}
                </div>
                <div className="text-sm font-semibold text-gray-700 mb-0.5">Pass Rate</div>
                <div className="text-xs text-green-500">transmission success rate</div>
              </div>

              {/* Total Books Today */}
              <div className="rounded-2xl border border-teal-300 bg-teal-100/60 hover:bg-teal-100 p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-sm">
                    <Activity className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">{summary?.Ongoing || 0} ongoing</span>
                </div>
                <div className="text-3xl font-black text-teal-600 mb-0.5">
                  {loading ? '…' : (summary?.TotalScans || 0).toLocaleString()}
                </div>
                <div className="text-sm font-semibold text-gray-700 mb-0.5">Total Books Today</div>
                <div className="text-xs text-teal-500">all scans this session</div>
              </div>
            </div>

            {/* Stage breakdown */}
            {stages.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {stages.map((s: any) => (
                  <div key={s.Stage} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide truncate">{s.Stage.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{s.Total.toLocaleString()}</p>
                    <div className="mt-2 space-y-1.5">
                      <Progress value={s.Total > 0 ? (s.Completed / s.Total) * 100 : 0} className="h-1.5" />
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span className="text-green-600">✓ {s.Completed}</span>
                        <span className="text-blue-500">↻ {s.Ongoing}</span>
                        {s.Failed > 0 && <span className="text-red-500">✗ {s.Failed}</span>}
                      </div>
                    </div>
                  </div>
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
                <Card className="border-border bg-card overflow-hidden py-0 gap-0">
                  <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border-b border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white">
                        <FileUp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {fromDate === toDate ? `Recent Scans — ${fromDate}` : `Recent Scans — ${fromDate} to ${toDate}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span className="text-xs text-gray-500">Live scan feed</span>
                        </div>
                      </div>
                    </div>
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
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-white">
                        <tr className="border-b border-gray-100">
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Scan Date</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Scan User</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Box</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">ISBN</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Pages</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Status</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                            Loading live data...
                          </td></tr>
                        ) : paginatedRecentScans.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-12 text-gray-400">No scans found</td></tr>
                        ) : paginatedRecentScans.map((item: any, i: number) => {
                          const statusWord = item.Status?.split(' ').pop() || 'ONGOING'
                          return (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="text-xs text-gray-500 px-4 py-3">
                                {item.ScanDate ? new Date(item.ScanDate).toLocaleDateString() : '—'}
                              </td>
                              <td className="text-xs font-semibold text-gray-800 px-4 py-3">{item.ScanUser || '—'}</td>
                              <td className="text-xs text-gray-500 px-4 py-3">{item.BoxNumber || '—'}</td>
                              <td className="font-mono text-xs text-gray-800 px-4 py-3">{item.ISBN}</td>
                              <td className="text-xs text-right font-semibold text-gray-800 px-4 py-3">{item.PageCount ?? '—'}</td>
                              <td className="px-4 py-3">{getStatusBadge(statusWord)}</td>
                              <td className="text-xs text-gray-500 px-4 py-3">{item.MachineName || '—'}</td>
                              <td className="text-xs text-gray-400 text-right px-4 py-3">
                                {item.Updated ? new Date(item.Updated).toLocaleTimeString() : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
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
                <Card className="border-border bg-card overflow-hidden py-0 gap-0">
                  <div className="flex items-center justify-between px-5 py-4 bg-teal-50 border-b border-teal-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {fromDate === toDate ? `Scans by Machine — ${fromDate}` : `Scans by Machine — ${fromDate} to ${toDate}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                          <span className="text-xs text-gray-500">Per machine output</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search machine or user..."
                        value={machineSearch}
                        onChange={(e) => setMachineSearch(e.target.value)}
                        className="w-56 pl-9 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-white">
                        <tr className="border-b border-gray-100">
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine Name</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Machine ID</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">User</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left w-48">Activity</th>
                          <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Total Scans</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          </td></tr>
                        ) : filteredByMachine.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-12 text-gray-400">{byMachine.length === 0 ? 'No machine data for today' : 'No machines match your search'}</td></tr>
                        ) : paginatedByMachine.map((m: any, i: number) => {
                          const maxScans = filteredByMachine[0]?.TotalScans || 1
                          return (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="font-semibold text-xs text-gray-800 px-4 py-3">{m.MachineName}</td>
                              <td className="font-mono text-xs text-gray-500 px-4 py-3">{m.MachineID}</td>
                              <td className="text-xs text-gray-700 px-4 py-3">{m.User}</td>
                              <td className="px-4 py-3">
                                <Progress value={(m.TotalScans / maxScans) * 100} className="h-2" />
                              </td>
                              <td className="text-xs font-bold text-right text-gray-800 px-4 py-3">
                                {m.TotalScans.toLocaleString()}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {filteredByMachine.length > 0 && machinesPagination.totalPages > 1 && (
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
        </div>
      </main>
      {/* Ranking Modal */}
      {showRanking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowRanking(false)}>
        <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '90vw', maxWidth: 1100, height: '90vh' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-5 bg-amber-50 border-b border-amber-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Performance Ranking</h3>
                <p className="text-xs text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <button onClick={() => setShowRanking(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-amber-200 text-gray-600 hover:bg-amber-100 hover:text-gray-900 transition-all font-semibold text-sm">✕</button>
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
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Books</p>
                  <p className="text-3xl font-black text-blue-600 mt-1">{ranking.totalBooks.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Pages</p>
                  <p className="text-3xl font-black text-purple-600 mt-1">{ranking.totalPages.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Highest Output</p>
                  <p className="text-3xl font-black text-amber-500 mt-1">{ranking.highestOutput}</p>
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg Output/User</p>
                  <p className="text-3xl font-black text-green-600 mt-1">{ranking.avgOutput}</p>
                </div>
              </div>

              <div className="flex gap-6 overflow-hidden flex-1 min-h-0">
                {/* Ranking Table */}
                <div className="flex-1 rounded-xl border border-gray-200 overflow-y-auto min-w-0">
                  <table className="w-full text-sm">
                    <colgroup>
                      <col className="w-[8%]" />
                      <col className="w-[36%]" />
                      <col className="w-[24%]" />
                      <col className="w-[8%]" />
                      <col className="w-[12%]" />
                    </colgroup>
                    <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                      <tr>
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Rank</th>
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">User</th>
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Books</th>
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Pages</th>
                        <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.data.map((r: any) => {
                        const pct = r.ScoreNum
                        const barColor = pct >= 90 ? '#6366f1' : pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
                        const medal = r.Rank === 1 ? '🥇' : r.Rank === 2 ? '🥈' : r.Rank === 3 ? '🥉' : null
                        return (
                          <tr key={r.Rank} className={`border-b border-gray-50 transition-colors ${r.Rank <= 3 ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 align-middle">
                              {medal ? (
                                <span className="text-lg leading-none">{medal}</span>
                              ) : (
                                <span className="text-sm font-bold text-gray-400">{r.Rank}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800 align-middle truncate">{r.ScanUser}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-800 align-middle">{Number(r.Books).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-500 align-middle">{Number(r.Pages).toLocaleString()}</td>
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                </div>
                                <span className="text-xs font-semibold w-9 text-right" style={{ color: barColor }}>{Math.round(pct)}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Score Distribution — pure CSS, no Recharts to avoid key collision bug */}
                <div className="w-72 flex flex-col gap-3 overflow-y-auto shrink-0">
                  <p className="text-sm font-semibold text-gray-700 shrink-0">Score Distribution</p>
                  {(() => {
                    const buckets = [
                      { label: '100%',      min: 100, max: 100, color: '#6366f1' },
                      { label: '96–99%',    min: 96,  max: 99,  color: '#10b981' },
                      { label: '91–95%',    min: 91,  max: 95,  color: '#22c55e' },
                      { label: '81–90%',    min: 81,  max: 90,  color: '#84cc16' },
                      { label: '71–80%',    min: 71,  max: 80,  color: '#eab308' },
                      { label: '61–70%',    min: 61,  max: 70,  color: '#f59e0b' },
                      { label: '51–60%',    min: 51,  max: 60,  color: '#f97316' },
                      { label: 'Below 50%', min: 0,   max: 50,  color: '#ef4444' },
                    ]
                    const maxUsers = Math.max(...buckets.map(b => ranking.data.filter((r: any) => r.ScoreNum >= b.min && r.ScoreNum <= b.max).length), 1)
                    return buckets.map(b => {
                      const count = ranking.data.filter((r: any) => r.ScoreNum >= b.min && r.ScoreNum <= b.max).length
                      const widthPct = (count / maxUsers) * 100
                      return (
                        <div key={b.label} className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-500 w-16 shrink-0 text-right">{b.label}</span>
                          <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden">
                            <div
                              className="h-full rounded-md transition-all"
                              style={{ width: `${widthPct}%`, backgroundColor: b.color, minWidth: count > 0 ? '1.5rem' : 0 }}
                            />
                          </div>
                          <span className="text-[11px] font-bold w-5 text-right" style={{ color: count > 0 ? b.color : '#9ca3af' }}>{count}</span>
                        </div>
                      )
                    })
                  })()}
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
