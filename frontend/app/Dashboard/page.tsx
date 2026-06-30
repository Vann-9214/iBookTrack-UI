"use client"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from "@/components/top-bar"
import { StatsBar } from "@/components/stats-bar"
import { ActivePipeline } from "@/components/active-pipeline"
import { TransmissionQueue } from "@/components/transmission-queue"
import { UnaccountedBooks } from "@/components/missing-item-log"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Search, Book, Package, Barcode, X } from "lucide-react"
import { DashboardMain } from "./DashboardMain"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/auth-api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface SearchResult {
  type: 'isbn' | 'lot'
  data: any
  books?: any[]
}

export default function DashboardPage() {
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

  const clearSearch = () => {
    setSearchResult(null)
    setSearchValue('')
    setRangeStart('')
    setRangeEnd('')
    setCurrentLot('')
    setDisplayRange(null)
    fetchDashboardStats()
  }

  const [boxScanInput, setBoxScanInput] = useState('')
  const [boxScanModal, setBoxScanModal] = useState<{ box: any; books: any[] } | null>(null)
  const [loadingBoxScan, setLoadingBoxScan] = useState(false)

  // Fetch dashboard stats on mount
  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async (lotNumber?: string) => {
    try {
      const statsUrl = lotNumber
        ? `${API_URL}/api/dashboard/stats?lot_number=${encodeURIComponent(lotNumber)}`
        : `${API_URL}/api/dashboard/stats`
      const pipelineUrl = lotNumber
        ? `${API_URL}/api/dashboard/pipeline-stats?lot_number=${encodeURIComponent(lotNumber)}`
        : `${API_URL}/api/dashboard/pipeline-stats`

      const [statsRes, pipelineRes, simflexRes] = await Promise.all([
        authFetch(statsUrl),
        authFetch(pipelineUrl),
        authFetch(`${API_URL}/api/scanning/live`).catch(() => null)
      ])
      const statsData = await statsRes.json()
      const pipelineData = await pipelineRes.json()

      // Get daily transmitted count + all-time total from Simflex
      let dailyTransmitted = 0
      let simflexAllTime = 0
      if (simflexRes && simflexRes.ok) {
        const simflex = await simflexRes.json()
        if (simflex.success) {
          if (simflex.byStage) {
            const transmitStage = simflex.byStage.find((s: any) => s.Stage === 'Transmission_Archive')
            dailyTransmitted = transmitStage?.Ongoing || 0
          }
          simflexAllTime = simflex.allTimeTotal || 0
        }
      }

      const stages = pipelineData.stageCounts || {}

      // Keep the Supabase box count for the Transmit stage so the pipeline card
      // remains clickable and shows the real boxes waiting at that station.
      // dailyTransmitted (Simflex ongoing) is kept separately for stats widgets.

      if (statsData.success) {
        setDashboardStats({ ...statsData.stats, pipelineStages: stages, dailyTransmitted, totalBooks: simflexAllTime || statsData.stats.totalBooks })
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
        // Validate: ISBN must be exactly 13 digits
        if (!searchValue.trim()) {
          toast({ title: 'Invalid ISBN', description: 'Please enter an ISBN.', variant: 'destructive' })
          setLoading(false)
          return
        }
        // Search by ISBN using exactly what was typed (already digits-only from onChange)
        const response = await authFetch(`${API_URL}/api/warehouse/search/isbn/${searchValue.trim()}`)
        const data = await response.json()
        
        if (data.success && data.book) {
          setSearchResult({
            type: 'isbn',
            data: data.book,
            books: [data.book]
          })
          
          // Show appropriate message based on where book was found
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
        // Search by Lot — use value exactly as typed
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
          // Fetch boxes for this lot using the exact typed lot number
          const response = await authFetch(`${API_URL}/api/boxes/lot/${encodeURIComponent(lotQuery)}`)
          const data = await response.json()
          
          if (data.success && data.boxes) {
            const allBooks: any[] = []
            for (const box of data.boxes) {
              const boxResponse = await authFetch(`${API_URL}/api/boxes/${box.id}`)
              const boxData = await boxResponse.json()
              if (boxData.box && boxData.box.books) {
                allBooks.push(...boxData.box.books)
              }
            }
            setSearchResult({
              type: 'lot',
              data: { lot_number: lotQuery, total_boxes: data.boxes.length, total_books: allBooks.length },
              books: allBooks
            })
            toast({ title: 'Lot Found', description: `Found ${allBooks.length} books in ${data.boxes.length} boxes` })
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
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      {/* Main Content */}
      <DashboardMain>
        <DashboardNavbar />
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Page Header */}
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Command Center
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real-time overview of the 8-step pipeline, transmissions, and warehouse activity.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={boxScanInput}
                    onChange={e => setBoxScanInput(e.target.value)}
                    onKeyDown={handleBoxScan}
                    placeholder="Scan box barcode..."
                    className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
                  />
                </div>
                <Button
                  variant="default"
                  size="default"
                  onClick={() => setSearchOpen(true)}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                >
                  <Search className="h-4 w-4" />
                  Search ISBN / Lot
                </Button>

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
                                  // Strip any non-digit characters
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
              </div>
            </header>

            {/* Top Stats Bar */}
            <StatsBar stats={dashboardStats} />

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
                  {searchResult.type === 'isbn' && searchResult.data && (
                    <div className="space-y-4">
                      {/* Status Badge */}
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
                  {searchResult.type === 'lot' && searchResult.books && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Lot Number</p>
                          <p className="font-semibold">{searchResult.data.lot_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Boxes</p>
                          <p className="font-semibold">{searchResult.data.total_boxes}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Books</p>
                          <p className="font-semibold">{searchResult.data.total_books}</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Books in this Lot:</h4>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {searchResult.books.length > 0 ? (
                            searchResult.books.map((book: any, index: number) => (
                              <div key={book.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">{book.isbn}</p>
                                  <p className="text-sm text-muted-foreground">{book.title || 'No title'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{book.book_type || 'N/A'}</p>
                                  <p className="text-xs text-muted-foreground">{book.current_stage || 'Unknown'}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-muted-foreground py-8">No books found in this lot</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Active Pipeline Flowchart */}
            <ActivePipeline currentLot={displayText} stats={dashboardStats} />

            {/* Bottom Split: Transmission Queue & Unaccounted Books */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <TransmissionQueue />
              <UnaccountedBooks />
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
                  {boxScanModal?.box.lot?.lot_number} · <span className="capitalize">{boxScanModal?.box.current_stage}</span> · {boxScanModal?.box.total_books} books
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
