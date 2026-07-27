'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { fetchWarehouseOverview, deleteSession, type OverviewLot } from '../services/warehouse.service'
import { AlertTriangle, Boxes, CheckCircle2, ChevronRight, Hash, Inbox, Loader2, Package, RefreshCw, Search, Trash2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useUser } from '@/hooks/use-user'
import { useToast } from '@/hooks/use-toast'

function BoxStatusBadge({ status }: { status: string | null }) {
  if (status === 'completed') return (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 gap-1 text-[10px] uppercase font-bold tracking-wide">
      <CheckCircle2 className="h-3 w-3" /> Completed
    </Badge>
  )
  if (status === 'in_progress') return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 gap-1 text-[10px] uppercase font-bold tracking-wide">
      <Loader2 className="h-3 w-3 animate-spin" /> In Progress
    </Badge>
  )
  if (status === 'delayed') return (
    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 gap-1 text-[10px] uppercase font-bold tracking-wide">
      <AlertTriangle className="h-3 w-3" /> Delayed
    </Badge>
  )
  if (status === 'received') return (
    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 gap-1 text-[10px] uppercase font-bold tracking-wide">
      <Inbox className="h-3 w-3" /> Received
    </Badge>
  )
  if (status === 'sent') return (
    <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 gap-1 text-[10px] uppercase font-bold tracking-wide">
      <ChevronRight className="h-3 w-3" /> Sent
    </Badge>
  )
  return (
    <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground text-[10px] uppercase font-bold tracking-wide">
      {status ? status.replace(/_/g, ' ') : 'No session'}
    </Badge>
  )
}

interface WarehouseLotsOverviewProps {
  brand: string
  /** Any changing value (e.g. the live lock list) that should trigger a background refetch. */
  refreshKey?: unknown
}

export function WarehouseLotsOverview({ brand, refreshKey }: WarehouseLotsOverviewProps) {
  const [lots, setLots] = useState<OverviewLot[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedLot, setExpandedLot] = useState<string | null>(null)
  const [boxPage, setBoxPage] = useState(1)
  const [lotSearchInput, setLotSearchInput] = useState('')
  const [debouncedLotSearch, setDebouncedLotSearch] = useState('')
  const [boxSearch, setBoxSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const pagination = usePagination({ totalItems, defaultPageSize: 10 })
  const { user } = useUser()
  const { toast } = useToast()
  const firstLoadRef = useRef(true)

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this delayed session?')) return
    try {
      await deleteSession(sessionId)
      toast({ title: 'Session Deleted', description: 'The delayed session has been removed.' })
      load(pagination.currentPage, pagination.pageSize, true)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete session', variant: 'destructive' })
    }
  }

  const load = useCallback(async (page: number, pageSize: number, background = false) => {
    if (background) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await fetchWarehouseOverview(page, pageSize, brand, debouncedLotSearch, activeTab)
      setLots(data.lots)
      setTotalItems(data.pagination.totalItems)
    } catch (err: any) {
      setError(err.message || 'Failed to load lots overview.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [brand, debouncedLotSearch, activeTab])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLotSearch(lotSearchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [lotSearchInput])

  useEffect(() => {
    if (firstLoadRef.current) return
    pagination.goToPage(1)
    load(1, pagination.pageSize, false)
  }, [debouncedLotSearch, activeTab])

  useEffect(() => {
    setExpandedLot(null)
    load(pagination.currentPage, pagination.pageSize, !firstLoadRef.current)
    firstLoadRef.current = false
  }, [pagination.currentPage, pagination.pageSize, load])

  // Background refetch when live lock events arrive, so statuses stay current
  // without the user needing to press refresh.
  useEffect(() => {
    if (firstLoadRef.current) return
    const timer = setTimeout(() => load(pagination.currentPage, pagination.pageSize, true), 400)
    return () => clearTimeout(timer)
  }, [refreshKey])

  const toggleLot = (lotId: string) => {
    setExpandedLot((prev) => {
      if (prev === lotId) return null
      setBoxPage(1)
      setBoxSearch('')
      return lotId
    })
  }

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm',
            brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          )}>
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-foreground leading-none">Lots &amp; Boxes</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              Received inventory and warehouse session status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative hidden sm:block mr-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input 
              placeholder="Search lots..." 
              value={lotSearchInput} 
              onChange={e => setLotSearchInput(e.target.value)}
              className="w-56 h-9 pl-9 text-xs bg-muted/40 border-transparent shadow-none focus-visible:bg-background focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-lg"
            />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-16 rounded-full bg-muted-foreground/15" />
          ) : (
            <Badge variant="outline" className={cn(
              'bg-background text-[11px] font-bold px-2.5 whitespace-nowrap',
              brand === 'jaguar' ? 'border-green-200 text-green-700' : 'border-blue-200 text-blue-700'
            )}>
              {totalItems} lots
            </Badge>
          )}
          <button
            onClick={() => load(pagination.currentPage, pagination.pageSize, true)}
            disabled={loading || refreshing}
            className="flex items-center justify-center w-8 h-8 rounded-lg border bg-card shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all disabled:opacity-50"
            aria-label="Refresh lots overview"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', (loading || refreshing) && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 sm:px-6 py-2 border-b shrink-0 flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setExpandedLot(null); setBoxPage(1); setBoxSearch(''); }}>
          <TabsList className="bg-muted/40 border ring-1 ring-black/5">
            <TabsTrigger value="all" className="text-xs">All Lots</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">
              In Progress
            </TabsTrigger>
            <TabsTrigger value="delayed" className="text-xs">
              Delayed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table header */}
      {!loading && !error && lots.length > 0 && (
        <div className="grid grid-cols-12 gap-4 px-5 sm:px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
          <div className="col-span-1"></div>
          <div className="col-span-5 sm:col-span-4">Lot Number</div>
          <div className="col-span-3 sm:col-span-4 text-center">Boxes</div>
          <div className="col-span-3 text-right pr-2">Actions</div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-border/50">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 sm:px-6 py-3.5">
                <div className="col-span-1"><Skeleton className="h-8 w-8 rounded-lg bg-muted-foreground/8" /></div>
                <div className="col-span-5 sm:col-span-4"><Skeleton className="h-4 w-24 rounded bg-muted-foreground/8" /></div>
                <div className="col-span-3 sm:col-span-4 flex justify-center"><Skeleton className="h-5 w-14 rounded-full bg-muted-foreground/8" /></div>
                <div className="col-span-3 flex justify-end"><Skeleton className="h-4 w-4 rounded bg-muted-foreground/8" /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive/70" />
            </div>
            <p className="text-sm font-bold text-foreground">Couldn&apos;t load lots</p>
            <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
          </div>
        ) : lots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-bold text-foreground">No lots yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">Lots will appear here as soon as a warehouse receiving session is started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {lots.map((lot) => {
              const expanded = expandedLot === lot.id
              const filteredBoxes = boxSearch
                ? lot.boxes.filter(b => b.box_number.toLowerCase().includes(boxSearch.toLowerCase()))
                : lot.boxes
              const boxPageSize = 10
              const totalBoxPages = Math.max(1, Math.ceil(filteredBoxes.length / boxPageSize))
              const displayedBoxes = filteredBoxes.slice((boxPage - 1) * boxPageSize, boxPage * boxPageSize)
              
              return (
                <div key={lot.id}>
                  {/* Lot row */}
                  <button
                    onClick={() => toggleLot(lot.id)}
                    className={cn(
                      'w-full grid grid-cols-12 gap-4 items-center px-5 sm:px-6 py-3 text-left transition-all duration-150 group',
                      expanded ? 'bg-primary/[0.03]' : 'hover:bg-muted/40'
                    )}
                    aria-expanded={expanded}
                  >
                    {/* Icon */}
                    <div className="col-span-1">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                        expanded
                          ? (brand === 'jaguar' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')
                          : 'bg-muted/60 text-muted-foreground group-hover:bg-muted'
                      )}>
                        <Package className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Lot name */}
                    <div className="col-span-5 sm:col-span-4 min-w-0">
                      <span className="text-sm font-bold text-foreground truncate block">
                        {String(lot.lot_number).toLowerCase().startsWith('lot') ? lot.lot_number : `Lot ${lot.lot_number}`}
                      </span>
                    </div>

                    {/* Box count */}
                    <div className="col-span-3 sm:col-span-4 flex justify-center">
                      <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground text-[11px] font-bold">
                        {lot.total_boxes} {lot.total_boxes === 1 ? 'box' : 'boxes'}
                      </Badge>
                    </div>

                    {/* Expand chevron */}
                    <div className="col-span-3 flex justify-end items-center gap-2 pr-1">
                      <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                        {expanded ? 'Collapse' : 'Expand'}
                      </span>
                      <ChevronRight className={cn(
                        'h-4 w-4 text-muted-foreground/60 transition-transform duration-200',
                        expanded && 'rotate-90'
                      )} />
                    </div>
                  </button>

                  {/* Expanded box list */}
                  {expanded && (
                    <div className="bg-muted/20 border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                      {lot.boxes.length === 0 ? (
                        <p className="px-6 py-6 text-xs font-medium text-muted-foreground text-center">No boxes received in this lot yet.</p>
                      ) : (
                        <div className="px-5 sm:px-6 py-3">
                          {/* Box sub-header */}
                          <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2 px-3">
                            <div className="grid grid-cols-12 gap-4 flex-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 items-center">
                              <div className="col-span-1"><Hash className="h-3 w-3" /></div>
                              <div className="col-span-4 sm:col-span-5">Box Number</div>
                              <div className="col-span-3 text-center">Books</div>
                              <div className="col-span-4 sm:col-span-3 text-right">Status</div>
                            </div>
                            <div className="relative shrink-0 ml-4 hidden sm:block">
                              <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground/60" />
                              <Input 
                                placeholder="Search boxes..." 
                                value={boxSearch} 
                                onChange={e => { setBoxSearch(e.target.value); setBoxPage(1); }}
                                className="w-40 h-7 pl-8 text-[11px] bg-background border-border/60 shadow-sm focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-md"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            {displayedBoxes.map((box, idx) => {
                              const absoluteIndex = (boxPage - 1) * boxPageSize + idx + 1
                              return (
                                <div key={box.id} className="grid grid-cols-12 gap-4 items-center px-3 py-2.5 rounded-lg hover:bg-background/60 transition-colors group">
                                  {/* Index */}
                                  <div className="col-span-1">
                                    <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums">{absoluteIndex}</span>
                                  </div>

                                  {/* Box name */}
                                  <div className="col-span-4 sm:col-span-5 min-w-0">
                                    <span className="text-[13px] font-semibold text-foreground truncate block group-hover:text-foreground transition-colors">
                                      Box {box.box_number}
                                    </span>
                                  </div>

                                  {/* Book count */}
                                  <div className="col-span-3 text-center">
                                    {box.total_expected_books > 0 ? (
                                      <span className="text-[12px] font-medium text-muted-foreground tabular-nums">
                                        {box.total_expected_books}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground/40">—</span>
                                    )}
                                  </div>

                                  {/* Status */}
                                  <div className="col-span-4 sm:col-span-3 flex justify-end items-center gap-2">
                                    {box.current_stage && (
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline-block truncate max-w-[120px]" title={box.current_stage}>
                                        {box.current_stage.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                    <BoxStatusBadge status={box.status} />
                                    {box.status === 'delayed' && box.session_id && user?.role === 'supervisor' && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSession(box.session_id!); }}
                                        className="ml-2 p-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                        title="Delete Delayed Session"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Inner pagination for boxes */}
                          {totalBoxPages > 1 && (
                            <div className="pt-3 pb-1 flex justify-end border-t border-border/40 mt-3">
                              <div className="scale-90 origin-right">
                                <Pagination
                                  currentPage={boxPage}
                                  totalPages={totalBoxPages}
                                  pageSize={boxPageSize}
                                  onPageChange={setBoxPage}
                                  canPrevPage={boxPage > 1}
                                  canNextPage={boxPage < totalBoxPages}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer: pagination */}
      {!loading && !error && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          onPageChange={pagination.goToPage}
          onPageSizeChange={pagination.setPageSize}
          canPrevPage={pagination.canPrevPage}
          canNextPage={pagination.canNextPage}
          className="shrink-0"
        />
      )}
    </div>
  )
}
