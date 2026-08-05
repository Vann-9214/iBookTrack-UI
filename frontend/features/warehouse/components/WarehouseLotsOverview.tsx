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
  /** Any changing value (e.g. manual refresh) that should trigger a foreground refetch (skeleton). */
  refreshTrigger?: unknown
  /** Unified loading state from parent. */
  unifiedLoading?: boolean
  /** Callback to notify parent of local loading state. */
  setOverviewLoading?: (loading: boolean) => void
}

export function WarehouseLotsOverview({ brand, refreshKey, refreshTrigger, unifiedLoading, setOverviewLoading }: WarehouseLotsOverviewProps) {
  const [lots, setLots] = useState<OverviewLot[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedLot, setExpandedLot] = useState<string | null>(null)
  const [closingLot, setClosingLot] = useState<string | null>(null)
  const [boxPage, setBoxPage] = useState(1)
  const [lotSearchInput, setLotSearchInput] = useState('')
  const [debouncedLotSearch, setDebouncedLotSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const pagination = usePagination({ totalItems, defaultPageSize: 10 })
  const { user } = useUser()
  const { toast } = useToast()
  const firstLoadRef = useRef(true)

  const displayLoading = unifiedLoading !== undefined ? unifiedLoading : loading

  useEffect(() => {
    setOverviewLoading?.(loading)
  }, [loading, setOverviewLoading])

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

  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    if (firstLoadRef.current) return
    pagination.goToPage(1)
    loadRef.current(1, pagination.pageSize, false)
  }, [debouncedLotSearch, activeTab, brand])

  useEffect(() => {
    setExpandedLot(null)
    loadRef.current(pagination.currentPage, pagination.pageSize, !firstLoadRef.current)
    firstLoadRef.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.pageSize])

  // Background refetch when live lock events arrive, so statuses stay current
  // without the user needing to press refresh.
  useEffect(() => {
    if (firstLoadRef.current) return
    const timer = setTimeout(() => loadRef.current(pagination.currentPage, pagination.pageSize, true), 400)
    return () => clearTimeout(timer)
  }, [refreshKey])

  // Foreground refetch (skeleton) on manual refresh button
  useEffect(() => {
    if (firstLoadRef.current) return
    if (refreshTrigger) {
      loadRef.current(1, pagination.pageSize, false) // also reset to page 1 on manual refresh
    }
  }, [refreshTrigger])

  const toggleLot = (lotId: string) => {
    if (expandedLot === lotId) {
      setClosingLot(lotId)
      window.setTimeout(() => {
        setExpandedLot(null)
        setClosingLot(null)
      }, 200)
    } else if (expandedLot && expandedLot !== lotId) {
      setClosingLot(expandedLot)
      window.setTimeout(() => {
        setExpandedLot(lotId)
        setClosingLot(null)
        setBoxPage(1)
      }, 200)
    } else {
      setExpandedLot(lotId)
      setBoxPage(1)
    }
  }

  const cardTheme = 'bg-white/68 border border-primary/15 ring-1 ring-primary/10 rounded-2xl'
  const iconTheme = 'premium-gradient-ui-card--solid'
  const textTheme = 'text-primary'
  const headerTextTheme = 'text-black'
  const subTextTheme = 'text-primary/80'
  const tableHeaderTheme = 'bg-primary/5 text-primary/70'
  const borderTheme = 'border-primary/20 focus-visible:ring-primary/20'

  return (
    <div className={cn("relative rounded-2xl border-2 shadow-sm ring-1 overflow-hidden flex flex-col transition duration-300", cardTheme)}>
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl" />
      {/* Header */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-black/5 shrink-0 bg-white/40 backdrop-blur-[2px] gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg shrink-0',
            iconTheme
          )}>
            <Boxes className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", textTheme)}>Inventory overview</p>
            <p className={cn("text-[15px] font-black tracking-tight leading-none", headerTextTheme)}>Lots & Boxes</p>
            <p className={cn("text-[11.5px] font-medium mt-0.5 truncate", subTextTheme)}>
              Received inventory and warehouse session status
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full sm:w-auto overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          <Tabs value={activeTab} className="w-full sm:w-auto" onValueChange={(val) => { setActiveTab(val); setExpandedLot(null); setBoxPage(1); }}>
            <TabsList className={cn("w-full flex bg-white/70 border-transparent shadow-sm ring-1 ring-black/5 h-8 p-0.5 rounded-lg", displayLoading && "opacity-50 pointer-events-none")}>
              <TabsTrigger disabled={displayLoading} value="all" className="flex-1 text-[11px] px-2 sm:px-3 py-1 rounded-md transition-all duration-200 font-medium hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95 data-[state=active]:font-bold data-[state=active]:hover:scale-100">All Lots</TabsTrigger>
              <TabsTrigger disabled={displayLoading} value="in_progress" className="flex-1 text-[11px] px-2 sm:px-3 py-1 rounded-md transition-all duration-200 font-medium hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95 data-[state=active]:font-bold data-[state=active]:hover:scale-100">
                In Progress
              </TabsTrigger>
              <TabsTrigger disabled={displayLoading} value="delayed" className="flex-1 text-[11px] px-2 sm:px-3 py-1 rounded-md transition-all duration-200 font-medium hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95 data-[state=active]:font-bold data-[state=active]:hover:scale-100">
                Delayed
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative block group flex-1 sm:flex-none w-full sm:w-auto">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", "text-primary group-focus-within:text-primary")} />
              <Input 
                placeholder="Search lots or boxes..." 
                value={lotSearchInput} 
                onChange={e => setLotSearchInput(e.target.value)}
                disabled={displayLoading}
                className={cn(
                  "w-full sm:w-56 h-9 pl-9 pr-4 text-xs font-medium bg-white/60 border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)] transition duration-300 rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0 disabled:opacity-50",
                  brand === 'jaguar' ? "focus-visible:border-emerald-300 focus-visible:ring-emerald-100/50" : "focus-visible:border-blue-300 focus-visible:ring-blue-100/50"
                )}
              />
            </div>
            {displayLoading ? (
              <Skeleton className="h-6 w-14 rounded-md bg-black/5 shrink-0" />
            ) : (
              <Badge variant="outline" className={cn(
                'bg-white/85 text-[10px] font-bold px-2.5 py-0.5 whitespace-nowrap shadow-sm border-transparent shrink-0',
                'text-primary ring-1 ring-primary/20'
              )}>
                {totalItems} lots
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Table header */}
      {!error && (
        <div className={cn("relative grid grid-cols-12 gap-3 px-4 sm:px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b border-black/5 items-center", tableHeaderTheme)}>
          <div className="col-span-1 flex justify-start"><Hash className="h-2.5 w-2.5" /></div>
          <div className="col-span-5 sm:col-span-3">Lot Number</div>
          <div className="hidden sm:block sm:col-span-3">Created By</div>
          <div className="col-span-3 sm:col-span-2 text-center">Boxes</div>
          <div className="col-span-3 text-right pr-1"></div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {displayLoading ? (
          <div className="divide-y divide-border/40">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-center px-4 sm:px-5 py-2.5">
                <div className="col-span-1 flex justify-start"><Skeleton className="h-3 w-3 rounded-sm bg-black/5" /></div>
                <div className="col-span-5 sm:col-span-3"><Skeleton className="h-4 w-20 rounded bg-black/5" /></div>
                <div className="hidden sm:block sm:col-span-3"><Skeleton className="h-4 w-24 rounded bg-black/5" /></div>
                <div className="col-span-3 sm:col-span-2 flex justify-center"><Skeleton className="h-5 w-12 rounded-md bg-black/5" /></div>
                <div className="col-span-3 flex justify-end items-center gap-1.5 pr-1">
                  <span className="text-[10px] font-medium text-muted-foreground/40 hidden sm:inline">Expand</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                </div>
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
            {lots.map((lot, idx) => {
              const expanded = expandedLot === lot.id
              const closing = closingLot === lot.id
              const boxPageSize = 10
              const totalBoxPages = Math.max(1, Math.ceil(lot.boxes.length / boxPageSize))
              const displayedBoxes = lot.boxes.slice((boxPage - 1) * boxPageSize, boxPage * boxPageSize)
              const absoluteLotIndex = (pagination.currentPage - 1) * pagination.pageSize + idx + 1
              
              return (
                <div key={lot.id} className={cn("transition-colors", expanded || closing ? "bg-white/60" : "")}>
                  {/* Lot row */}
                  <button
                    onClick={() => toggleLot(lot.id)}
                    className={cn(
                      'w-full grid grid-cols-12 gap-3 items-center px-4 sm:px-5 py-2.5 text-left transition duration-150 group',
                      expanded
                        ? cn('text-white shadow-lg shadow-black/10', iconTheme)
                        : 'hover:bg-primary/5'
                    )}
                    aria-expanded={expanded || closing}
                  >
                    {/* Index */}
                    <div className="col-span-1 flex justify-start items-center">
                      <span className={cn("text-[11px] font-black tabular-nums transition-colors", expanded ? "text-white/90" : "text-primary")}>#{absoluteLotIndex}</span>
                    </div>

                    {/* Lot name */}
                    <div className="col-span-5 sm:col-span-3 min-w-0">
                      <span className={cn("text-[13px] font-bold truncate block transition-colors", expanded ? "text-white" : "text-gray-800 group-hover:text-black")}>
                        {String(lot.lot_number).toLowerCase().startsWith('lot') ? lot.lot_number : `Lot ${lot.lot_number}`}
                      </span>
                      {lot.created_by_name && (
                        <span className={cn("sm:hidden text-[10px] truncate block transition-colors", expanded ? "text-white/70" : "text-muted-foreground")}>
                          by {lot.created_by_name}
                        </span>
                      )}
                    </div>

                    {/* Created By column (desktop only) */}
                    <div className="hidden sm:flex sm:col-span-3 min-w-0 items-center">
                      {lot.created_by_name ? (
                        <span className={cn("text-[12px] truncate transition-colors", expanded ? "text-white/80" : "text-muted-foreground")}>
                          {lot.created_by_name}
                        </span>
                      ) : (
                        <span className={cn("text-[12px] italic transition-colors", expanded ? "text-white/50" : "text-muted-foreground/50")}>
                          Unknown
                        </span>
                      )}
                    </div>

                    {/* Box count */}
                    <div className="col-span-3 sm:col-span-2 flex justify-center">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-bold py-0 h-5 shadow-sm transition-colors",
                        expanded 
                          ? "bg-white/20 border-white/20 text-white" 
                          : "bg-white/60 text-gray-600 border-black/5 group-hover:text-primary group-hover:border-primary/30"
                      )}>
                        {lot.total_boxes} {lot.total_boxes === 1 ? 'box' : 'boxes'}
                      </Badge>
                    </div>

                    {/* Expand chevron */}
                    <div className="col-span-3 flex justify-end items-center gap-1.5 pr-1">
                      <span className={cn("text-[10px] font-medium hidden sm:inline transition-colors", expanded ? "text-white/80" : "text-muted-foreground")}>
                        {expanded ? 'Collapse' : 'Expand'}
                      </span>
                      <ChevronRight className={cn(
                        'h-3.5 w-3.5 transition duration-200',
                        expanded ? 'rotate-90 text-white' : 'text-muted-foreground/60'
                      )} />
                    </div>
                  </button>

                  {/* Expanded box list */}
                  {(expanded || closing) && (
                    <div className={cn("bg-white/50 border-t border-black/5", closing ? 'animate-out fade-out slide-out-to-top-1 duration-200' : expanded ? 'animate-in fade-in slide-in-from-top-1 duration-200' : '')}>
                      {lot.boxes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 px-6 text-center">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center ring-1 ring-black/5 shadow-sm">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                          <p className="text-xs font-semibold text-gray-600">No boxes received</p>
                        </div>
                      ) : (
                        <div className="px-4 sm:px-5 py-3">
                          {/* Box sub-header */}
                          <div className="flex items-center justify-between px-2 mb-2">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Boxes className="h-3.5 w-3.5 opacity-70" />
                              Box Details
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-12 gap-3 pb-1.5 mb-1.5 px-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 items-center">
                            <div className="col-span-1"><Hash className="h-2.5 w-2.5" /></div>
                            <div className="col-span-4 sm:col-span-3">Box Number</div>
                            <div className="col-span-2 text-center">Books</div>
                            <div className="col-span-2 text-center hidden sm:block">Last Holder</div>
                            <div className="col-span-5 sm:col-span-4 text-right">Status</div>
                          </div>
                          
                          <div className="space-y-1.5">
                            {displayedBoxes.map((box, idx) => {
                              const absoluteIndex = (boxPage - 1) * boxPageSize + idx + 1
                              return (
                                <div key={box.id} className="grid grid-cols-12 gap-3 items-center px-3 py-2 bg-white/80 rounded-xl hover:bg-white shadow-sm ring-1 ring-black/5 transition-colors group">
                                  {/* Index */}
                                  <div className="col-span-1">
                                    <span className="text-[10px] font-bold text-gray-400 tabular-nums">{absoluteIndex}</span>
                                  </div>

                                  {/* Box name */}
                                  <div className="col-span-4 sm:col-span-3 min-w-0 flex items-center gap-2">
                                    <span className="text-[12px] font-bold text-gray-800 truncate block transition-colors">
                                      BOX {box.box_number}
                                    </span>
                                  </div>

                                  {/* Book count */}
                                  <div className="col-span-2 text-center">
                                    {box.total_expected_books > 0 ? (
                                      <span className="text-[11px] font-bold text-gray-600 tabular-nums bg-gray-100/80 px-2 py-0.5 rounded-md">
                                        {box.total_expected_books}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-300">—</span>
                                    )}
                                  </div>

                                  {/* Last Touched */}
                                  <div className="col-span-2 text-center hidden sm:block truncate px-1">
                                    {box.last_touched_by ? (
                                      <span className="text-[10px] font-medium text-gray-600 truncate" title={box.last_touched_by}>
                                        {box.last_touched_by}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-300">—</span>
                                    )}
                                  </div>

                                  {/* Status */}
                                  <div className="col-span-5 sm:col-span-4 flex justify-end items-center gap-2">
                                    {box.current_stage && (
                                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline-block truncate max-w-[100px]" title={box.current_stage}>
                                        {box.current_stage.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                    <BoxStatusBadge status={box.status} />
                                    {box.status === 'delayed' && box.session_id && user?.role === 'supervisor' && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSession(box.session_id!); }}
                                        className="ml-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                            <div className="pt-3 pb-0.5 mt-3">
                              <Pagination
                                currentPage={boxPage}
                                totalPages={totalBoxPages}
                                pageSize={boxPageSize}
                                onPageChange={setBoxPage}
                                canPrevPage={boxPage > 1}
                                canNextPage={boxPage < totalBoxPages}
                                className="border-t border-black/5 py-2 px-0"
                              />
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
      {!displayLoading && !error && pagination.totalPages > 1 && (
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
