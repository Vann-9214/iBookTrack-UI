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
      return lotId
    })
  }

  const isJaguar = brand === 'jaguar'
  const cardTheme = isJaguar
    ? 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/20 border-emerald-200/50 ring-emerald-100/50'
    : 'bg-gradient-to-br from-blue-50/50 to-indigo-100/20 border-blue-200/50 ring-blue-100/50'
  const iconTheme = isJaguar
    ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25'
    : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25'
  const headerTextTheme = isJaguar ? 'text-emerald-950/80' : 'text-blue-950/80'
  const subTextTheme = isJaguar ? 'text-emerald-600/80' : 'text-blue-600/80'

  return (
    <div className={cn("relative rounded-2xl border shadow-sm ring-1 overflow-hidden flex flex-col transition-all duration-300", cardTheme)}>
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/20 blur-2xl" />
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 sm:px-5 py-3 border-b border-black/5 shrink-0 bg-white/40 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg',
            iconTheme
          )}>
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <p className={cn("text-[15px] font-black tracking-tight leading-none", headerTextTheme)}>Lots & Boxes</p>
            <p className={cn("text-[11.5px] font-medium mt-0.5", subTextTheme)}>
              Received inventory and warehouse session status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input 
              placeholder="Search lots or boxes..." 
              value={lotSearchInput} 
              onChange={e => setLotSearchInput(e.target.value)}
              className="w-48 h-8 pl-8 text-xs bg-white/70 backdrop-blur-sm border-transparent shadow-sm focus-visible:bg-white focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-lg"
            />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-14 rounded-md bg-black/5" />
          ) : (
            <Badge variant="outline" className={cn(
              'bg-white/80 backdrop-blur-sm text-[10px] font-bold px-2.5 py-0.5 whitespace-nowrap shadow-sm border-transparent',
              brand === 'jaguar' ? 'text-emerald-700 ring-1 ring-emerald-200' : 'text-blue-700 ring-1 ring-blue-200'
            )}>
              {totalItems} lots
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="relative px-4 sm:px-5 py-2 border-b border-black/5 shrink-0 flex items-center justify-between bg-white/20 backdrop-blur-sm">
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setExpandedLot(null); setBoxPage(1); }}>
          <TabsList className="bg-white/60 backdrop-blur-md border-transparent shadow-sm ring-1 ring-black/5 h-8 p-0.5 rounded-lg">
            <TabsTrigger value="all" className="text-[11px] px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">All Lots</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-[11px] px-3 py-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
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
        <div className={cn("relative grid grid-cols-12 gap-3 px-4 sm:px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b border-black/5", isJaguar ? "bg-emerald-50/50 text-emerald-800/70" : "bg-blue-50/50 text-blue-800/70")}>
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
              const boxPageSize = 10
              const totalBoxPages = Math.max(1, Math.ceil(lot.boxes.length / boxPageSize))
              const displayedBoxes = lot.boxes.slice((boxPage - 1) * boxPageSize, boxPage * boxPageSize)
              
              return (
                <div key={lot.id} className={cn("transition-colors", expanded ? "bg-white/60" : "")}>
                  {/* Lot row */}
                  <button
                    onClick={() => toggleLot(lot.id)}
                    className={cn(
                      'w-full grid grid-cols-12 gap-3 items-center px-4 sm:px-5 py-2.5 text-left transition-all duration-150 group',
                      expanded ? 'bg-transparent' : 'hover:bg-white/40'
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
                      <span className="text-[13px] font-bold text-gray-800 truncate block group-hover:text-black transition-colors">
                        {String(lot.lot_number).toLowerCase().startsWith('lot') ? lot.lot_number : `Lot ${lot.lot_number}`}
                      </span>
                    </div>

                    {/* Box count */}
                    <div className="col-span-3 sm:col-span-4 flex justify-center">
                      <Badge variant="outline" className={cn("bg-white/60 text-gray-600 text-[10px] font-bold py-0 h-5 border-black/5 shadow-sm", isJaguar ? "group-hover:text-emerald-700 group-hover:border-emerald-200" : "group-hover:text-blue-700 group-hover:border-blue-200")}>
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
                    <div className="bg-white/50 border-t border-black/5 animate-in fade-in slide-in-from-top-1 duration-200">
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
                                    <span className={cn("flex shrink-0 h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold", isJaguar ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>BX</span>
                                    <span className="text-[12px] font-bold text-gray-800 truncate block transition-colors">
                                      {box.box_number}
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
                            <div className="pt-3 pb-0.5 flex justify-end border-t border-black/5 mt-3">
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
