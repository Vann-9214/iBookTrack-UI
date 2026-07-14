"use client"

import { useState, useEffect, useCallback } from "react"
import { authFetch } from "@/lib/auth-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useBrand } from "@/hooks/use-brand"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import {
  Inbox, Send, Package, CheckCircle2,
  Loader2, RefreshCw, ChevronDown, ChevronRight, BookOpen, Search, X, Scissors
} from "lucide-react"
import { RefreshControl } from "@/components/refresh-control"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

interface BookInBox {
  id: string
  isbn: string
  title: string | null
  scan_status: string
  scanned_at: string
  book_type?: string
  flag?: {
    issue: string
  }
}

interface BoxEntry {
  id: string
  box_number: string
  total_books_expected: number
  lot: { lot_number: string } | null
  box_sessions?: { status: string, inventory_time_send?: string, cut_time_received?: string, total_scanned?: number }[]
}

export default function CutPage() {
  const { brand } = useBrand()

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'box' | 'lot' | 'isbn'>('box')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [incomingBoxes, setIncomingBoxes] = useState<BoxEntry[]>([])
  const [outgoingBoxes, setOutgoingBoxes] = useState<BoxEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [receivingBox, setReceivingBox] = useState<string | null>(null)
  const [sendingBox, setSendingBox] = useState<string | null>(null)

  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null)
  const [boxBooks, setBoxBooks] = useState<Record<string, BookInBox[]>>({})
  const [loadingBoxBooks, setLoadingBoxBooks] = useState<string | null>(null)

  const toggleBox = async (boxId: string) => {
    if (expandedBoxId === boxId) {
      setExpandedBoxId(null)
      return
    }
    setExpandedBoxId(boxId)
    if (!boxBooks[boxId]) {
      setLoadingBoxBooks(boxId)
      try {
        const res = await authFetch(`${API_URL}/api/boxes/${boxId}`)
        const data = await res.json()
        setBoxBooks(prev => ({ ...prev, [boxId]: data.box?.books || [] }))
      } catch (e) {
        setBoxBooks(prev => ({ ...prev, [boxId]: [] }))
      } finally {
        setLoadingBoxBooks(null)
      }
    }
  }

  const fetchBoxes = useCallback(async () => {
    setLoading(true)
    try {
      const buildUrl = (stage: string) => {
        const params = new URLSearchParams()
        params.append('current_stage', stage)
        params.append('box_type', brand)
        const query = searchQuery.trim()
        if (query) {
          if (searchType === 'box') params.append('box_number', query)
          if (searchType === 'isbn') params.append('isbn', query)
        }
        return `${API_URL}/api/boxes?${params.toString()}`
      }

      // Fetch incoming: still in 'inventory' stage but their session status is 'sent'
      const resIncoming = await authFetch(buildUrl('inventory'))
      const incomingData = await resIncoming.json()

      const filteredIncoming = (incomingData.boxes || []).filter((b: BoxEntry) => {
         return b.box_sessions?.some(s => s.status === 'sent')
      })

      setIncomingBoxes(filteredIncoming)

      // Fetch outgoing: current stage is 'cut', but NOT sent to endorsement yet
      const resOutgoing = await authFetch(buildUrl('cut'))
      const outgoingData = await resOutgoing.json()
      const filteredOutgoing = (outgoingData.boxes || []).filter((b: BoxEntry) => {
         return !b.box_sessions?.some(s => s.status === 'sent')
      })
      setOutgoingBoxes(filteredOutgoing)

      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch boxes:', e)
    } finally {
      setLoading(false)
    }
  }, [brand, searchQuery, searchType])

  useEffect(() => {
    const timer = setTimeout(() => { fetchBoxes() }, 300)
    return () => clearTimeout(timer)
  }, [fetchBoxes])

  const handleReceiveBox = async (box: BoxEntry) => {
    setReceivingBox(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Received at Cut' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to receive box')
      toast.success(`${box.box_number} received`)
      fetchBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive box')
    } finally {
      setReceivingBox(null)
    }
  }

  const handleSendBox = async (box: BoxEntry) => {
    setSendingBox(box.id)
    try {
      const res = await authFetch(`${API_URL}/api/boxes/${box.id}/send-forward`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Sent to Endorsement from Cut' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send box')
      toast.success(`${box.box_number} sent to Endorsement`)
      fetchBoxes()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send box')
    } finally {
      setSendingBox(null)
    }
  }

  const matchesSearch = (box: BoxEntry) => {
    if (searchType !== 'lot') return true
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    return (box.lot?.lot_number || '').toLowerCase().includes(query)
  }

  const filteredIncoming = incomingBoxes.filter(matchesSearch)
  const filteredOutgoing = outgoingBoxes.filter(matchesSearch)

  return (
    <div className={cn("flex h-screen bg-background font-sans", `theme-${brand}`)}>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardNavbar />
        
        <main className="flex-1 overflow-auto flex flex-col p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                  <Scissors className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                    Cut Station
                  </h1>
                  <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    Book cutting and spine removal for <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-white", brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500')}>{brand}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Search bar */}
            <div className="flex items-center gap-2 mb-6">
              <Select value={searchType} onValueChange={(v) => setSearchType(v as 'box' | 'lot' | 'isbn')}>
                <SelectTrigger className="w-[130px] shrink-0 hover:text-primary-foreground hover:bg-primary transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="box">Box No.</SelectItem>
                  <SelectItem value="lot">Lot</SelectItem>
                  <SelectItem value="isbn">ISBN</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    let val = e.target.value
                    if (searchType === 'isbn') {
                      val = val.replace(/\D/g, '').slice(0, 13)
                    }
                    setSearchQuery(val)
                  }}
                  inputMode={searchType === 'isbn' ? 'numeric' : 'text'}
                  maxLength={searchType === 'isbn' ? 13 : undefined}
                  placeholder={
                    searchType === 'isbn'
                      ? 'ISBN (10 or 13 digits)'
                      : searchType === 'lot'
                        ? 'Search by lot number…'
                        : 'Search by box number…'
                  }
                  className="w-full pl-9 pr-9 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-px">
              <button
                onClick={() => setActiveTab('incoming')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all',
                  activeTab === 'incoming'
                    ? 'border-primary text-primary bg-primary/10 rounded-t-lg'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-lg'
                )}
              >
                <Inbox className="h-4 w-4" /> Incoming
                <span className={cn(
                  'ml-1.5 px-2 py-0.5 rounded-full text-xs',
                  activeTab === 'incoming' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>{filteredIncoming.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('outgoing')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all',
                  activeTab === 'outgoing'
                    ? 'border-primary text-primary bg-primary/10 rounded-t-lg'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-lg'
                )}
              >
                <Send className="h-4 w-4" /> Outgoing
                <span className={cn(
                  'ml-1.5 px-2 py-0.5 rounded-full text-xs',
                  activeTab === 'outgoing' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>{filteredOutgoing.length}</span>
              </button>
              
              <div className="ml-auto">
                <RefreshControl onRefresh={fetchBoxes} refreshing={loading} lastUpdated={lastUpdated} />
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading boxes...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {activeTab === 'incoming' && (
                  <div className="flex flex-col gap-2">
                    {filteredIncoming.length === 0 ? (
                      <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                        <Inbox className="h-10 w-10 mb-3 text-primary" />
                        <p className="font-semibold text-foreground">No incoming boxes</p>
                        <p className="text-sm">Boxes sent from Inventory will appear here.</p>
                      </div>
                    ) : (
                      filteredIncoming.map(box => {
                        const isExpanded = expandedBoxId === box.id
                        const rowBooks = boxBooks[box.id] || []
                        const isLoadingBooks = loadingBoxBooks === box.id
                        const bookCount = box.box_sessions?.[0]?.total_scanned ?? box.total_books_expected ?? 0
                        return (
                          <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                            <div className="flex items-center px-4 py-3 gap-4">
                              <button
                                onClick={() => toggleBox(box.id)}
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleBox(box.id)}>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Sent from Inventory</span>
                                </div>
                                <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                              </div>
                              {box.box_sessions?.[0]?.inventory_time_send && (
                                <div className="shrink-0 hidden sm:block text-right mr-2">
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(box.box_sessions[0].inventory_time_send).toLocaleDateString()}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/80">
                                    {new Date(box.box_sessions[0].inventory_time_send).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </p>
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReceiveBox(box) }}
                                disabled={receivingBox === box.id}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                              >
                                {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
                                {receivingBox === box.id ? 'Receiving...' : 'Receive Box'}
                              </button>
                            </div>
                            
                            {isExpanded && (
                              <div className="border-t border-border px-5 py-3 bg-muted/30 max-h-[300px] overflow-y-auto">
                                {isLoadingBooks ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
                                  </div>
                                ) : rowBooks.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
                                ) : (
                                  <div className="flex flex-col">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">{rowBooks.length} book{rowBooks.length !== 1 ? 's' : ''} in this box</p>
                                    <div className="flex flex-col gap-1 border-l-2 border-primary/30 pl-3">
                                      {rowBooks.map(book => (
                                        <div key={book.id} className="flex justify-between items-center py-1">
                                          <div className="flex flex-col">
                                            <span className="text-xs font-medium text-foreground">{book.isbn}</span>
                                            {book.title && <span className="text-[10px] text-muted-foreground break-words whitespace-normal">{book.title}</span>}
                                          </div>
                                          <div className="flex gap-2 items-center">
                                            {book.book_type && (
                                              <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', book.book_type.toLowerCase() === 'jaguar' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                                                {book.book_type.charAt(0).toUpperCase() + book.book_type.slice(1).toLowerCase()}
                                              </span>
                                            )}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
                
                {activeTab === 'outgoing' && (
                  <div className="flex flex-col gap-2">
                    {filteredOutgoing.length === 0 ? (
                      <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
                        <Send className="h-10 w-10 mb-3 text-primary" />
                        <p className="font-semibold text-foreground">No outgoing boxes</p>
                        <p className="text-sm">Received boxes will appear here.</p>
                      </div>
                    ) : (
                      filteredOutgoing.map(box => {
                        const isExpanded = expandedBoxId === box.id
                        const rowBooks = boxBooks[box.id] || []
                        const isLoadingBooks = loadingBoxBooks === box.id
                        const bookCount = box.box_sessions?.[0]?.total_scanned ?? box.total_books_expected ?? 0
                        return (
                          <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
                            <div className="flex items-center px-4 py-3 gap-4">
                              <button
                                onClick={() => toggleBox(box.id)}
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleBox(box.id)}>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Ready to Send</span>
                                </div>
                                <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
                              </div>
                              {box.box_sessions?.[0]?.cut_time_received && (
                                <div className="shrink-0 hidden sm:block text-right mr-2">
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(box.box_sessions[0].cut_time_received).toLocaleDateString()}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/80">
                                    {new Date(box.box_sessions[0].cut_time_received).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </p>
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSendBox(box) }}
                                disabled={sendingBox === box.id}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                              >
                                {sendingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {sendingBox === box.id ? 'Sending...' : 'Send to Endorsement'}
                              </button>
                            </div>
                            
                            {isExpanded && (
                              <div className="border-t border-border px-5 py-3 bg-muted/30 max-h-[300px] overflow-y-auto">
                                {isLoadingBooks ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading books…
                                  </div>
                                ) : rowBooks.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">No books recorded in this box yet.</p>
                                ) : (
                                  <div className="flex flex-col">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">{rowBooks.length} book{rowBooks.length !== 1 ? 's' : ''} in this box</p>
                                    <div className="flex flex-col gap-1 border-l-2 border-primary/30 pl-3">
                                      {rowBooks.map(book => (
                                        <div key={book.id} className="flex justify-between items-center py-1">
                                          <div className="flex flex-col">
                                            <span className="text-xs font-medium text-foreground">{book.isbn}</span>
                                            {book.title && <span className="text-[10px] text-muted-foreground break-words whitespace-normal">{book.title}</span>}
                                          </div>
                                          <div className="flex gap-2 items-center">
                                            {book.book_type && (
                                              <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', book.book_type.toLowerCase() === 'jaguar' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                                                {book.book_type.charAt(0).toUpperCase() + book.book_type.slice(1).toLowerCase()}
                                              </span>
                                            )}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${book.scan_status === 'processable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {book.scan_status === 'processable' ? 'Processable' : 'Non-Processable'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
