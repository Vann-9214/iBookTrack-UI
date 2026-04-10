"use client"

import { useState, useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { StatsBar } from "@/components/stats-bar"
import { ActivePipeline } from "@/components/active-pipeline"
import { TransmissionQueue } from "@/components/transmission-queue"
import { UnaccountedBooks } from "@/components/missing-item-log"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Book, Package } from "lucide-react"
import { DashboardMain } from "./DashboardMain"
import { useToast } from "@/hooks/use-toast"

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

  // Fetch dashboard stats on mount
  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/stats`)
      const data = await response.json()
      if (data.success) {
        setDashboardStats(data.stats)
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
        // Search by ISBN
        const response = await fetch(`${API_URL}/api/warehouse/search/isbn/${searchValue.trim()}`)
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
        // Search by Lot
        if (isRange && rangeStart && rangeEnd) {
          setDisplayRange(`Lot ${rangeStart} - Lot ${rangeEnd}`)
          setCurrentLot("")
          // Fetch books in range
          const response = await fetch(`${API_URL}/api/dashboard/stats?lot_range_start=${rangeStart}&lot_range_end=${rangeEnd}`)
          const data = await response.json()
          if (data.success) {
            setSearchResult({ type: 'lot', data: data.stats, books: [] })
          }
        } else if (searchValue) {
          setCurrentLot(searchValue)
          setDisplayRange(null)
          // Fetch books in specific lot
          const response = await fetch(`${API_URL}/api/boxes/lot/Lot ${searchValue}`)
          const data = await response.json()
          
          if (data.success && data.boxes) {
            // Get all books from all boxes in this lot
            const allBooks: any[] = []
            for (const box of data.boxes) {
              const boxResponse = await fetch(`${API_URL}/api/boxes/${box.id}`)
              const boxData = await boxResponse.json()
              if (boxData.success && boxData.box.books) {
                allBooks.push(...boxData.box.books)
              }
            }
            setSearchResult({
              type: 'lot',
              data: { lot_number: `Lot ${searchValue}`, total_boxes: data.boxes.length, total_books: allBooks.length },
              books: allBooks
            })
            toast({ title: 'Lot Found', description: `Found ${allBooks.length} books in ${data.boxes.length} boxes` })
          } else {
            toast({ title: 'Not Found', description: 'Lot not found in database', variant: 'destructive' })
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

  const displayText = displayRange || (currentLot ? `Lot ${currentLot}` : "")
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      {/* Main Content */}
      <DashboardMain>
        <ScrollArea className="flex-1 h-0 min-h-0">
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
              <Dialog open={searchOpen} onOpenChange={setSearchOpen} modal={false}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default" 
                    size="default" 
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                  >
                    <Search className="h-4 w-4" />
                    Search ISBN / Lot
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle>Search Dashboard</DialogTitle>
                    <DialogDescription>
                      Search for books by ISBN or view all books in a specific lot
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
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
                          placeholder={searchType === "isbn" ? "e.g., 978-0-13-468599-1" : "e.g., 34"}
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                        />
                      </div>
                    )}

                    <Button onClick={handleSearch} className="w-full" disabled={loading}>
                      {loading ? 'Searching...' : 'Apply Search'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </header>

            {/* Top Stats Bar */}
            <StatsBar stats={dashboardStats} />

            {/* Search Results */}
            {searchResult && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {searchResult.type === 'isbn' ? <Book className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                    {searchResult.type === 'isbn' ? 'ISBN Search Result' : 'Lot Search Results'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {searchResult.type === 'isbn' && searchResult.data && (
                    <div className="space-y-4">
                      {/* Status Badge */}
                      <div className="flex gap-2">
                        {searchResult.data.in_warehouse && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            ✓ In Warehouse
                          </span>
                        )}
                        {searchResult.data.in_ilms && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                            📚 Found in iLMS
                          </span>
                        )}
                        {!searchResult.data.in_warehouse && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                            ⚠️ Not Scanned Yet
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full">
                          <p className="text-sm text-muted-foreground">ISBN</p>
                          <p className="font-mono text-lg font-bold">{searchResult.data.isbn}</p>
                        </div>
                        <div className="col-span-full">
                          <p className="text-sm text-muted-foreground">Title</p>
                          <p className="font-semibold text-base">{searchResult.data.title || 'Unknown Title'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">📦 Box Number</p>
                          <p className="font-bold text-lg text-primary">{searchResult.data.box_number || 'Not assigned'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">📍 Lot Number</p>
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
                                  <p className="font-mono text-sm font-semibold">{book.isbn}</p>
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
        </ScrollArea>
      </DashboardMain>
    </div>
  )
}
