"use client"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from "@/components/top-bar"
import { StatsBar } from "@/components/stats-bar"
import { ActivePipeline } from "@/components/active-pipeline"
import { TransmissionQueue } from "@/components/transmission-queue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Search, Book, Package, Barcode, X, RefreshCw, CheckCircle2, Clock, AlertCircle, LayoutDashboard } from "lucide-react"
import { DashboardMain } from "./DashboardMain"
import { useToast } from "@/hooks/use-toast"
import { RefreshControl } from "@/components/refresh-control"
import { useBrand } from "@/hooks/use-brand"
import { authFetch } from "@/lib/auth-api"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

interface SearchResult {
  type: 'isbn' | 'lot'
  data: any
  books?: any[]
}

export default function DashboardPage() {
  const { brand } = useBrand()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchType, setSearchType] = useState<"isbn" | "lot">("lot")
  const [searchValue, setSearchValue] = useState("")
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")
  const [isRange, setIsRange] = useState(false)
  const [currentLot, setCurrentLot] = useState("")
  const [displayRange, setDisplayRange] = useState<string | null>(null)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const { toast } = useToast()

  // New state hooks for tracking background refresh metrics
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastStatsUpdate, setLastStatsUpdate] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [liveScans, setLiveScans] = useState<any[]>([])

  const refreshAll = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchDashboardStats(currentLot || undefined),
      ])
      if (searchResult) await handleSearch()
      setRefreshKey(k => k + 1)
    } finally {
      setIsRefreshing(false)
    }
  }

  const clearSearch = () => {
    setSearchResult(null)
    setSearchValue('')
    setRangeStart('')
    setRangeEnd('')
    setCurrentLot('')
    setDisplayRange(null)
    refreshAll()
  }

  const [boxScanInput, setBoxScanInput] = useState('')
  const [boxScanModal, setBoxScanModal] = useState<{ box: any; books: any[] } | null>(null)
  const [loadingBoxScan, setLoadingBoxScan] = useState(false)

  // Fetch dashboard stats on mount and when the brand changes
  useEffect(() => {
    refreshAll()
  }, [brand])

  const fetchDashboardStats = async (lotNumber?: string) => {
    try {
      let statsUrl = `${API_URL}/api/dashboard/stats?box_type=${brand}`
      if (lotNumber) statsUrl += `&lot_number=${encodeURIComponent(lotNumber)}`

      let pipelineUrl = `${API_URL}/api/dashboard/pipeline-stats?brand=${brand}`
      if (lotNumber) pipelineUrl += `&lot_number=${encodeURIComponent(lotNumber)}`

      const [statsRes, pipelineRes, simflexRes] = await Promise.all([
        authFetch(statsUrl),
        authFetch(pipelineUrl),
        authFetch(`${API_URL}/api/scanning/live?newProcessOnly=true&location=${brand}`).catch((e) => { console.error('[Dashboard] /live failed:', e); return null })
      ])
      const statsData = await statsRes.json()
      const pipelineData = await pipelineRes.json()

      let dailyTransmitted = 0
      let simflexAllTime = 0
      let scanWipCount = 0
      let transmitBooks = 0
      if (simflexRes && simflexRes.ok) {
        const simflex = await simflexRes.json()
        scanWipCount = simflex.scanWipCount || 0
        console.log('[Dashboard] /live scanWipCount:', scanWipCount, '| transmitBooks:', simflex.transmitBooks, '| success:', simflex.success)
        if (simflex.success) {
          dailyTransmitted = simflex.summary?.completedTransmissions || 0
          simflexAllTime   = simflex.allTimeTotal || 0
          transmitBooks = simflex.transmitBooks || 0
          setLiveScans(simflex.recentScans || [])
        }
      } else {
        console.warn('[Dashboard] simflexRes not ok:', simflexRes?.status)
      }

      const stages = {
        ...(pipelineData.stageCounts || {}),
        scan:     scanWipCount,
        transmit: transmitBooks,
      }

      if (statsData.success) {
        setDashboardStats({ ...statsData.stats, pipelineStages: stages, dailyTransmitted, totalBooks: simflexAllTime || statsData.stats.totalBooks })
        setLastStatsUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }

  const handleSearch = async () => {
    if (searchType === 'isbn' && !searchValue.trim()) {
      toast({ title: 'Error', description: 'Please enter an ISBN', variant: 'destructive' })
      return
    }
    if (searchType === 'lot' && !isRange && !searchValue.trim()) {
      toast({ title: 'Error', description: 'Please enter a Lot number', variant: 'destructive' })
      return
    }
    if (isRange && (!rangeStart || !rangeEnd)) {
      toast({ title: 'Error', description: 'Please enter both range values', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      if (searchType === 'isbn') {
        if (!searchValue.trim()) {
          toast({ title: 'Invalid ISBN', description: 'Please enter an ISBN.', variant: 'destructive' })
          setLoading(false)
          return
        }
        const response = await authFetch(`${API_URL}/api/warehouse/search/isbn/${searchValue.trim()}`)
        const data = await response.json()
        
        if (data.success && data.book) {
          setSearchResult({
            type: 'isbn',
            data: data.book,
            books: [data.book]
          })
          
          if (data.book.in_warehouse) {
            toast({ title: 'Book Found in Warehouse', description: `Located in ${data.book.box_number || 'Unknown Box'}` })
          } else if (data.book.in_ilms) {
            toast({ 
              title: 'Book Found in iLMS', 
              description: 'Book exists in client system but not scanned into warehouse yet',
              variant: 'default'
            })
          } else {
            toast({ title: 'Book Found', description: 'Book information retrieved' })
          }
        } else {
          toast({ title: 'Not Found', description: data.message || 'ISBN not found in iLMS or database', variant: 'destructive' })
          setSearchResult(null)
        }
      } else if (searchType === 'lot') {
        const lotQuery = searchValue.trim()
        if (isRange && rangeStart && rangeEnd) {
          setDisplayRange(`${rangeStart} – ${rangeEnd}`)
          setCurrentLot("")
          const response = await authFetch(`${API_URL}/api/dashboard/stats?lot_range_start=${encodeURIComponent(rangeStart)}&lot_range_end=${encodeURIComponent(rangeEnd)}`)
          const data = await response.json()
          if (data.success) {
            setSearchResult({ type: 'lot', data: data.stats, books: [] })
          }
        } else if (lotQuery) {
          setCurrentLot(lotQuery)
          setDisplayRange(null)
          fetchDashboardStats(lotQuery)
          const response = await authFetch(`${API_URL}/api/dashboard/lot-details/${encodeURIComponent(lotQuery)}`)
          const data = await response.json()

          if (data.success && data.lotDetails) {
            setSearchResult({ type: 'lot', data: data.lotDetails, books: [] })
            toast({ title: 'Lot Found', description: `${data.lotDetails.total_books} books across ${data.lotDetails.total_boxes} boxes` })
          } else {
            toast({ title: 'Not Found', description: `Lot "${lotQuery}" not found. Check the exact lot number as it appears in the system.`, variant: 'destructive' })
            setSearchResult(null)
          }
        }
      }
      setSearchOpen(false)
    } catch (error) {
      console.error('Search error:', error)
      toast({ title: 'Error', description: 'Failed to search', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleBoxScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const q = boxScanInput.trim()
    if (!q) return
    setBoxScanModal(null)
    setLoadingBoxScan(true)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/by-number/${encodeURIComponent(q)}`)
      const data = await res.json()
      if (data.box) {
        setBoxScanModal({ box: data.box, books: data.box.books || [] })
      } else {
        toast({ title: 'Not Found', description: `Box "${q}" not found`, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to look up box', variant: 'destructive' })
    } finally {
      setLoadingBoxScan(false)
      setBoxScanInput('')
    }
  }

  const displayText = displayRange || (currentLot ? `Lot ${currentLot.replace(/^lot[-\s]*/i, '').trim()}` : "")
  
  const lastUpdateLabel = lastStatsUpdate
    ? `Updated ${lastStatsUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
    : 'Not updated yet'

  return (
    <div className={cn("flex h-dvh overflow-hidden bg-background", `theme-${brand}`)}>  
      <DashboardSidebar />

      {/* Main Content */}
      <DashboardMain>
        <DashboardNavbar />
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
            {/* Page Header */}
            <header className="flex flex-col gap-3">
              {/* Title row — always visible */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                    <LayoutDashboard className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                      Command Center
                    </h1>
                    <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      Overview of operations for <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-white", brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500')}>{brand}</span>
                    </p>
                  </div>
                </div>
                {/* Refresh + timestamp — hidden on mobile */}
                <RefreshControl onRefresh={refreshAll} refreshing={isRefreshing} lastUpdated={lastStatsUpdate} storageKey="dashboard" className="hidden sm:flex" />
              </div>

              {/* Controls row — scan + search always on one line */}
              <div className="flex items-center gap-2 justify-end"> 
                <Button
                  variant="default"
                  size="default"
                  onClick={() => setSearchOpen(true)}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shrink-0"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden xs:inline">Search ISBN / Lot</span>
                  <span className="xs:hidden">Search</span>
                </Button>
              </div>

              {/* Search Dashboard Modal */}
              {searchOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSearchOpen(false)}>
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                            <Search className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-foreground">Search Dashboard</h3>
                            <p className="text-xs text-muted-foreground">Search by ISBN or view all books in a lot</p>
                          </div>
                        </div>
                        <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Body */}
                      <div className="space-y-4 p-5 overflow-y-auto">
                        <div className="flex gap-2">
                          <Button
                            variant={searchType === "isbn" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSearchType("isbn")}
                            className="flex-1"
                          >
                            ISBN
                          </Button>
                          <Button
                            variant={searchType === "lot" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSearchType("lot")}
                            className="flex-1"
                          >
                            Lot
                          </Button>
                        </div>

                        {searchType === "lot" && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="range"
                              checked={isRange}
                              onChange={(e) => setIsRange(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <label htmlFor="range" className="text-sm font-medium">
                              Search by Range
                            </label>
                          </div>
                        )}

                        {isRange && searchType === "lot" ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">From Lot</label>
                              <Input
                                placeholder="e.g., 35"
                                value={rangeStart}
                                onChange={(e) => setRangeStart(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">To Lot</label>
                              <Input
                                placeholder="e.g., 36"
                                value={rangeEnd}
                                onChange={(e) => setRangeEnd(e.target.value)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="text-sm font-medium mb-1.5 block">
                              {searchType === "isbn" ? "ISBN Number" : "Lot Number"}
                            </label>
                            <Input
                              placeholder={searchType === "isbn" ? "ISBN number (digits only)" : "Lot number, e.g., 64"}
                              value={searchValue}
                              onChange={(e) => {
                                if (searchType === "isbn") {
                                  setSearchValue(e.target.value.replace(/[^0-9]/g, ''))
                                } else {
                                  setSearchValue(e.target.value)
                                }
                              }}
                              inputMode={searchType === "isbn" ? "numeric" : "text"}
                            />
                            {searchType === "isbn" && searchValue.length > 0 && (
                              <p className={`text-xs mt-1 ${
                                searchValue.length === 13 ? 'text-emerald-600'
                                : searchValue.length > 13 ? 'text-amber-500'
                                : 'text-muted-foreground'
                              }`}>
                                {searchValue.length} digit{searchValue.length !== 1 ? 's' : ''}
                                {searchValue.length === 13 ? ' ✓' : ''}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {searchResult && (
                            <Button variant="outline" onClick={() => { clearSearch(); setSearchOpen(false) }} className="flex-1">
                              Clear
                            </Button>
                          )}
                          <Button onClick={handleSearch} className={searchResult ? 'flex-1' : 'w-full'} disabled={loading}>
                            {loading ? 'Searching...' : 'Apply Search'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </header>

            {/* Top Stats Bar */}
            <StatsBar stats={dashboardStats} refreshKey={refreshKey} loading={isRefreshing} />

            {/* Search Results */}
            {searchResult && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {searchResult.type === 'isbn' ? <Book className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                      {searchResult.type === 'isbn' ? 'ISBN Search Result' : 'Lot Search Results'}
                    </CardTitle>
                    <button
                      onClick={clearSearch}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading && (
                    <div className="space-y-4">
                      <div className="flex gap-2 mb-6">
                        <Skeleton className="h-6 w-24 rounded-full bg-muted-foreground/20" />
                        <Skeleton className="h-6 w-28 rounded-full bg-muted-foreground/20" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full space-y-2">
                          <Skeleton className="h-4 w-16 rounded bg-muted-foreground/20" />
                          <Skeleton className="h-7 w-48 rounded bg-muted-foreground/20" />
                        </div>
                        <div className="col-span-full space-y-2">
                          <Skeleton className="h-4 w-16 rounded bg-muted-foreground/20" />
                          <Skeleton className="h-5 w-3/4 rounded bg-muted-foreground/20" />
                        </div>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24 rounded bg-muted-foreground/20" />
                            <Skeleton className="h-7 w-32 rounded bg-muted-foreground/20" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!loading && searchResult.type === 'isbn' && searchResult.data && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        {searchResult.data.in_warehouse && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            In Warehouse
                          </span>
                        )}
                        {searchResult.data.in_ilms && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                            Found in iLMS
                          </span>
                        )}
                        {!searchResult.data.in_warehouse && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                            Not Scanned Yet
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full">
                          <p className="text-sm text-muted-foreground">ISBN</p>
                          <p className="text-lg font-bold">{searchResult.data.isbn}</p>
                        </div>
                        <div className="col-span-full">
                          <p className="text-sm text-muted-foreground">Title</p>
                          <p className="font-semibold text-base">{searchResult.data.title || 'Unknown Title'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Box Number</p>
                          <p className="font-bold text-lg text-primary">{searchResult.data.box_number || 'Not assigned'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lot Number</p>
                          <p className="font-bold text-lg text-primary">{searchResult.data.lot_number || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Stage</p>
                          <p className="font-semibold capitalize">{searchResult.data.current_stage || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Scan Count</p>
                          <p className="font-semibold">{searchResult.data.scan_count || 0} times</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!loading && searchResult.type === 'lot' && searchResult.data && (
                    <div className="space-y-5">
                      {/* Status + progress row */}
                      <div className="flex items-center gap-3">
                        {searchResult.data.processing_status === 'Completed' && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                          </span>
                        )}
                        {searchResult.data.processing_status === 'In Progress' && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                            <Clock className="h-3.5 w-3.5" /> In Progress
                          </span>
                        )}
                        {searchResult.data.processing_status === 'Not Started' && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold border border-border">
                            <AlertCircle className="h-3.5 w-3.5" /> Not Started
                          </span>
                        )}
                        {searchResult.data.lot_type && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold border border-primary/30 bg-primary/10 text-primary capitalize">
                            {searchResult.data.lot_type}
                          </span>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Overall Completion</span>
                            <span className="text-xs font-semibold">{searchResult.data.completion_progress ?? 0}%</span>
                          </div>
                          <Progress value={searchResult.data.completion_progress ?? 0} className="h-1.5" />
                        </div>
                      </div>

                      {/* Summary stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Lot Number', value: searchResult.data.lot_number },
                          { label: 'Total Boxes', value: searchResult.data.total_boxes },
                          { label: 'Total Books', value: searchResult.data.total_books },
                          { label: 'Transmitted', value: searchResult.data.books_by_status?.transmitted ?? 0 },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-xl bg-muted/40 border border-border px-3 py-2.5">
                            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                            <p className="text-base font-bold text-foreground">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Stage breakdown */}
                      {searchResult.data.stage_breakdown && Object.keys(searchResult.data.stage_breakdown).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pipeline Stages</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(searchResult.data.stage_breakdown as Record<string, number>).map(([stage, count]) => (
                              <span key={stage} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border text-xs">
                                <span className="font-semibold capitalize text-foreground">{stage}</span>
                                <span className="bg-background text-muted-foreground font-bold px-1.5 py-0.5 rounded-full text-[10px]">{count as number}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Book status breakdown */}
                      {searchResult.data.books_by_status && (
                        <div className="grid grid-cols-2 gap-2 border-t pt-4">
                          {[
                            { label: 'Transmitted', value: searchResult.data.books_by_status.transmitted, color: 'text-emerald-600' },
                            { label: 'Pending', value: searchResult.data.books_by_status.pending, color: 'text-amber-600' },
                            { label: 'Processable', value: searchResult.data.books_by_status.processable, color: 'text-blue-600' },
                            { label: 'Non-Processable', value: searchResult.data.books_by_status.non_processable, color: 'text-red-600' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                              <span className="text-xs text-muted-foreground">{label}</span>
                              <span className={`text-sm font-bold ${color}`}>{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Active Pipeline Flowchart */}
            <ActivePipeline currentLot={displayText} stats={dashboardStats} brand={brand} loading={isRefreshing} />

            {/* Transmission Queue - Full Width (hidden on mobile) */}
            <div className="hidden md:flex flex-1 w-full flex-col min-h-0">
              <TransmissionQueue scans={liveScans} loading={isRefreshing} />
            </div>
          </div>
        </div>
      </DashboardMain>

      {/* Box Scan Modal */}
      {(boxScanModal || loadingBoxScan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setBoxScanModal(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{boxScanModal?.box.box_number}</h3>
                <p className="text-xs text-muted-foreground">
                  {boxScanModal?.box.lot?.lot_number} · <span className="capitalize">{boxScanModal?.box.current_stage}</span> · {boxScanModal?.box.total_books_expected} books
                </p>
              </div>
              <button onClick={() => setBoxScanModal(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            {loadingBoxScan ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading contents...</p>
            ) : boxScanModal && boxScanModal.books.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No scan records found for this box.</p>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="pb-2 text-left font-medium w-6">#</th>
                      <th className="pb-2 text-left font-medium pr-3">ISBN</th>
                      <th className="pb-2 text-left font-medium pr-3">Title</th>
                      <th className="pb-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boxScanModal?.books.map((book: any, i: number) => (
                      <tr key={book.id} className="border-b border-border/40 last:border-0">
                        <td className="py-1.5 text-muted-foreground pr-2">{i + 1}</td>
                        <td className="py-1.5 pr-3">{book.isbn}</td>
                        <td className="py-1.5 pr-3 max-w-[260px] truncate text-foreground">{book.title || '—'}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : book.scan_status === 'non_processable' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>{book.scan_status === 'processable' ? 'Processable' : book.scan_status === 'non_processable' ? 'Non-Processable' : book.scan_status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}