'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { fetchWarehouseOverview, deleteSession, type OverviewLot } from '../services/warehouse.service'
import { AlertTriangle, Boxes, CheckCircle2, ChevronRight, Hash, Inbox, Loader2, Package, Search, Trash2 } from 'lucide-react'
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
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm',
            brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          )}>
            <Boxes className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-foreground leading-none">Lots & Boxes</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
              Received inventory and warehouse session status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input 
              placeholder="Search lots..." 
              value={lotSearchInput} 
              onChange={e => setLotSearchInput(e.target.value)}
              className="w-48 h-8 pl-8 text-xs bg-muted/40 border-transparent shadow-none focus-visible:bg-background focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-lg"
            />
          </div>
          {loading ? (
            <Skeleton className="h-5 w-14 rounded-full bg-muted-foreground/15" />
          ) : (
            <Badge variant="outline" className={cn(
              'bg-background text-[10px] font-bold px-2 whitespace-nowrap',
              brand === 'jaguar' ? 'border-green-200 text-green-700' : 'border-blue-200 text-blue-700'
            )}>
              {totalItems} lots
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-5 py-1.5 border-b shrink-0 flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setExpandedLot(null); setBoxPage(1); setBoxSearch(''); }}>
          <TabsList className="bg-muted/40 border ring-1 ring-black/5 h-8">
            <TabsTrigger value="all" className="text-[11px] px-2.5 py-1">All Lots</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-[11px] px-2.5 py-1">
              In Progress
            </TabsTrigger>
            <TabsTrigger value="delayed" className="text-[11px] px-2.5 py-1">
              Delayed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table header */}
      {!loading && !error && lots.length > 0 && (
        <div className="grid grid-cols-12 gap-3 px-4 sm:px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
          <div className="col-span-1"></div>
          <div className="col-span-5 sm:col-span-4">Lot Number</div>
          <div className="col-span-3 sm:col-span-4 text-center">Boxes</div>
          <div className="col-span-3 text-right pr-1">Actions</div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-border/50">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-center px-4 sm:px-5 py-2">
                <div className="col-span-1"><Skeleton className="h-7 w-7 rounded-md bg-muted-foreground/8" /></div>
                <div className="col-span-5 sm:col-span-4"><Skeleton className="h-3.5 w-20 rounded bg-muted-foreground/8" /></div>
                <div className="col-span-3 sm:col-span-4 flex justify-center"><Skeleton className="h-4 w-12 rounded-full bg-muted-foreground/8" /></div>
                <div className="col-span-3 flex justify-end"><Skeleton className="h-3.5 w-3.5 rounded bg-muted-foreground/8" /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive/70" />
            </div>
            <p className="text-sm font-bold text-foreground">Couldn&apos;t load lots</p>
            <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
          </div>
        ) : lots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="h-5 w-5 text-muted-foreground/50" />
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
                      'w-full grid grid-cols-12 gap-3 items-center px-4 sm:px-5 py-2 text-left transition-all duration-150 group',
                      expanded ? 'bg-primary/[0.03]' : 'hover:bg-muted/40'
                    )}
                    aria-expanded={expanded}
                  >
                    {/* Icon */}
                    <div className="col-span-1">
                      <div className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
                        expanded
                          ? (brand === 'jaguar' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')
                          : 'bg-muted/60 text-muted-foreground group-hover:bg-muted'
                      )}>
                        <Package className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Lot name */}
                    <div className="col-span-5 sm:col-span-4 min-w-0">
                      <span className="text-[13px] font-bold text-foreground truncate block">
                        {String(lot.lot_number).toLowerCase().startsWith('lot') ? lot.lot_number : `Lot ${lot.lot_number}`}
                      </span>
                    </div>

                    {/* Box count */}
                    <div className="col-span-3 sm:col-span-4 flex justify-center">
                      <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground text-[10px] font-bold py-0 h-5">
                        {lot.total_boxes} {lot.total_boxes === 1 ? 'box' : 'boxes'}
                      </Badge>
                    </div>

                    {/* Expand chevron */}
                    <div className="col-span-3 flex justify-end items-center gap-1.5 pr-1">
                      <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline">
                        {expanded ? 'Collapse' : 'Expand'}
                      </span>
                      <ChevronRight className={cn(
                        'h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200',
                        expanded && 'rotate-90'
                      )} />
                    </div>
                  </button>

                  {/* Expanded box list */}
                  {expanded && (
                    <div className="bg-muted/20 border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                      {lot.boxes.length === 0 ? (
                        <p className="px-5 py-4 text-xs font-medium text-muted-foreground text-center">No boxes received in this lot yet.</p>
                      ) : (
                        <div className="px-4 sm:px-5 py-2">
                          {/* Box sub-header */}
                          <div className="flex items-center justify-between px-2 mb-1.5">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Box List</div>
                            <div className="relative shrink-0 hidden sm:block">
                              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground/60" />
                              <Input 
                                placeholder="Search boxes..." 
                                value={boxSearch} 
                                onChange={e => { setBoxSearch(e.target.value); setBoxPage(1); }}
                                className="w-36 h-6 pl-7 text-[10px] bg-background border-border/60 shadow-sm focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-md"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-3 border-b border-border/40 pb-1.5 mb-1 px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 items-center">
                            <div className="col-span-1"><Hash className="h-2.5 w-2.5" /></div>
                            <div className="col-span-4 sm:col-span-3">Box Number</div>
                            <div className="col-span-2 text-center">Books</div>
                            <div className="col-span-2 text-center hidden sm:block">Last Holder</div>
                            <div className="col-span-5 sm:col-span-4 text-right">Status</div>
                          </div>
                          <div className="space-y-0">
                            {displayedBoxes.map((box, idx) => {
                              const absoluteIndex = (boxPage - 1) * boxPageSize + idx + 1
                              return (
                                <div key={box.id} className="grid grid-cols-12 gap-3 items-center px-2 py-1.5 rounded-md hover:bg-background/60 transition-colors group">
                                  {/* Index */}
                                  <div className="col-span-1">
                                    <span className="text-[10px] font-bold text-muted-foreground/50 tabular-nums">{absoluteIndex}</span>
                                  </div>

                                  {/* Box name */}
                                  <div className="col-span-4 sm:col-span-3 min-w-0">
                                    <span className="text-[12px] font-semibold text-foreground truncate block group-hover:text-foreground transition-colors">
                                      Box {box.box_number}
                                    </span>
                                  </div>

                                  {/* Book count */}
                                  <div className="col-span-2 text-center">
                                    {box.total_expected_books > 0 ? (
                                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                                        {box.total_expected_books}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground/40">—</span>
                                    )}
                                  </div>

                                  {/* Last Touched */}
                                  <div className="col-span-2 text-center hidden sm:block truncate px-1">
                                    {box.last_touched_by ? (
                                      <span className="text-[10px] font-medium text-muted-foreground" title={box.last_touched_by}>
                                        {box.last_touched_by}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground/40">—</span>
                                    )}
                                  </div>

                                  {/* Status */}
                                  <div className="col-span-5 sm:col-span-4 flex justify-end items-center gap-1.5">
                                    {box.current_stage && (
                                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline-block truncate max-w-[100px]" title={box.current_stage}>
                                        {box.current_stage.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                    <BoxStatusBadge status={box.status} />
                                    {box.status === 'delayed' && box.session_id && user?.role === 'supervisor' && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSession(box.session_id!); }}
                                        className="ml-1 p-1 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                        title="Delete Delayed Session"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Inner pagination for boxes */}
                          {totalBoxPages > 1 && (
                            <div className="pt-2 pb-0.5 flex justify-end border-t border-border/40 mt-2">
                              <div className="scale-[0.85] origin-right">
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
