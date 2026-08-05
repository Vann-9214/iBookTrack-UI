'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CheckCircle2, XCircle, Loader2, Activity, ChevronLeft, ChevronRight } from "lucide-react"
import { authFetch } from "@/lib/auth-api"
import { useBrand } from "@/hooks/use-brand"
import { Skeleton } from "@/components/ui/skeleton"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""


// Utility function to cleanly format stage identifiers
function formatPipelineStage(stage: string) {
  if (!stage) return '—'
  if (stage === 'Tif2PDF') return 'PDF Conversion'
  if (stage === 'Validate') return 'Jaguar Validate'
  return stage.replace(/_/g, ' ')
}

// Replaces getStatusBadge to match the parent layout's multi-stage badge system
function getPipelineStatusBadge(status: string) {
  const parts = status?.split(' ') || []
  const state = parts.pop() || 'ONGOING'
  const stage = parts.join(' ')
  const formattedStage = formatPipelineStage(stage)
  const stateUpper = state.toUpperCase()

  const renderBadge = () => {
    if (stateUpper === 'COMPLETED') return (
      <Badge variant="outline" className="px-1.5 py-0 h-4 border-success/30 bg-success/10 text-success gap-1 text-[8px] uppercase font-bold">
        <CheckCircle2 className="h-2.5 w-2.5" /> COMPLETED
      </Badge>
    )
    if (stateUpper === 'FAILED') return (
      <Badge variant="outline" className="px-1.5 py-0 h-4 border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[8px] uppercase font-bold">
        <XCircle className="h-2.5 w-2.5" /> FAILED
      </Badge>
    )
    return (
      <Badge variant="outline" className="px-1.5 py-0 h-4 border-blue-300 bg-blue-50 text-blue-700 gap-1 text-[8px] uppercase font-bold">
        <Loader2 className="h-2.5 w-2.5 animate-spin" /> ONGOING
      </Badge>
    )
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[8px] font-bold text-muted-foreground uppercase leading-tight">{formattedStage}</span>
      {renderBadge()}
    </div>
  )
}

function formatTime(val: string) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface TransmissionQueueProps {
  scans?: any[]
  loading?: boolean
}

const MOBILE_PAGE_SIZE = 5

export function TransmissionQueue({ scans: propScans, loading: propLoading = false }: TransmissionQueueProps) {
  const { brand } = useBrand()
  const [fetchedScans, setFetchedScans] = useState<any[]>([])
  const [loading, setLoading] = useState(!propScans)
  const [mobilePage, setMobilePage] = useState(0)

  const scans = useMemo(
    () => {
      const source = propScans || fetchedScans
      return [...source]
        .sort((a, b) => new Date(b.Updated || b.ScanDate || 0).getTime() - new Date(a.Updated || a.ScanDate || 0).getTime())
        .slice(0, 20)
    },
    [propScans, fetchedScans]
  )

  const fetchLive = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch(`${API_URL}/api/scanning/live?location=${brand}&newProcessOnly=true`)
      const data = await res.json()
      if (data.success && data.recentScans) {
        setFetchedScans(data.recentScans)
      }
    } catch (e) {
      console.error('Failed to fetch live scans:', e)
    } finally {
      setLoading(false)
    }
  }, [brand])

  useEffect(() => {
    if (propScans) return
    fetchLive()
  }, [brand, propScans, fetchLive])

  const [enrichedData, setEnrichedData] = useState<Record<string, { box: string, lot: string }>>({})
  const fetchedIsbns = useRef<Set<string>>(new Set())

  useEffect(() => {
    const missingIsbns = scans
      .filter(item => (item.BoxNumber === '—' || !item.BoxNumber) && !fetchedIsbns.current.has(item.ISBN))
      .map(item => item.ISBN)
      .filter(Boolean)

    if (missingIsbns.length > 0) {
      missingIsbns.forEach(isbn => fetchedIsbns.current.add(isbn))
      
      const fetchEnrichment = async () => {
        try {
          const res = await authFetch(`${API_URL}/api/scanning/enrich-ilms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isbns: missingIsbns })
          })
          const data = await res.json()
          if (data.success && data.enriched) {
            setEnrichedData(prev => ({ ...prev, ...data.enriched }))
          }
        } catch (e) {
          console.error('Failed to enrich ILMS data:', e)
        }
      }
      fetchEnrichment()
    }
  }, [scans])

  const ongoingCount = scans.filter(s => s.Status?.toUpperCase().includes('ONGOING')).length

  return (
    <Card className={cn("hidden sm:flex relative flex-col gap-0 overflow-hidden p-0 h-full rounded-2xl border-2 shadow-sm ring-1", "bg-gradient-to-br from-primary/5 via-white to-primary/10 border-primary/20 ring-primary/10")}>
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl z-0" />
      {/* Header - sticky */}
      <div className={cn("relative z-10 flex items-center justify-between px-5 py-4 border-b shrink-0", "bg-transparent border-primary/20")}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md", "bg-primary shadow-primary/20")}>
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-gray-800 whitespace-nowrap">Live WIP Books</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", brand === 'jaguar' ? "bg-primary" : "bg-primary")} />
              <span className={cn("text-xs font-medium", brand === 'jaguar' ? "text-primary" : "text-primary")}>
                {ongoingCount > 0 ? `${ongoingCount} actively processing` : 'actively processing'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {propLoading || loading ? (
            <Skeleton className="h-6 w-16 rounded-full bg-muted-foreground/20" />
          ) : (
            <span className={cn("text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow-sm", "bg-primary")}>
              {`${scans.length} books`}
            </span>
          )}
        </div>
      </div>

      <CardContent className="relative z-10 flex-1 p-0 min-h-0">
        {propLoading || loading ? (
          <div className="h-full overflow-hidden flex flex-col relative z-0">
            <table className="w-full text-sm">
              <TableHeader className="sticky top-0 z-20" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 5%, white)" }}>
                <TableRow className="border-primary/20 hover:bg-transparent bg-transparent">
                  <TableHead className="text-xs text-primary font-bold">Scan Date</TableHead>
                  <TableHead className="text-xs text-primary font-bold">User</TableHead>
                  <TableHead className="text-xs text-primary font-bold">Lot</TableHead>
                  <TableHead className="text-xs text-primary font-bold">Box</TableHead>
                  <TableHead className="text-xs text-primary font-bold">ISBN</TableHead>
                  <TableHead className="text-xs text-primary font-bold">Pages</TableHead>
                  <TableHead className="text-xs text-primary font-bold">
                    <div className="relative left-16">Status</div>
                  </TableHead>
                  <TableHead className="text-xs text-primary font-bold">
                    <div className="relative left-16">Machine</div>
                  </TableHead>
                  <TableHead className="text-xs text-primary font-bold text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="border-border/50 hover:bg-transparent h-10">
                    <TableCell className="py-0.5"><Skeleton className="h-3.5 w-24 sm:w-28 rounded-sm bg-muted-foreground/10" /></TableCell>
                    <TableCell className="py-0.5"><Skeleton className="h-3.5 w-12 sm:w-16 rounded-sm bg-muted-foreground/10" /></TableCell>
                    <TableCell className="py-0.5"><Skeleton className="h-4 w-10 sm:w-12 rounded bg-muted-foreground/10" /></TableCell>
                    <TableCell className="py-0.5"><Skeleton className="h-3.5 w-12 sm:w-14 rounded-sm bg-muted-foreground/10" /></TableCell>
                    <TableCell className="py-0.5"><Skeleton className="h-3.5 w-20 sm:w-24 rounded-sm bg-muted-foreground/10" /></TableCell>
                    <TableCell className="py-0.5"><Skeleton className="h-3.5 w-6 sm:w-8 rounded-sm bg-muted-foreground/10" /></TableCell>
                    <TableCell className="py-0.5">
                      <div className="relative left-16">
                        <Skeleton className="h-5 w-16 sm:w-20 rounded-full bg-muted-foreground/10" />
                      </div>
                    </TableCell>
                    <TableCell className="py-0.5">
                      <div className="relative left-16">
                        <Skeleton className="h-3.5 w-16 sm:w-20 rounded-sm bg-muted-foreground/10" />
                      </div>
                    </TableCell>
                    <TableCell className="py-0.5"><Skeleton className="h-3.5 w-10 sm:w-12 ml-auto rounded-sm bg-muted-foreground/10" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-muted-foreground">No scan data for today</p>
          </div>
        ) : (() => {
          const totalPages = Math.ceil(scans.length / MOBILE_PAGE_SIZE)
          const mobileRows = scans.slice(mobilePage * MOBILE_PAGE_SIZE, (mobilePage + 1) * MOBILE_PAGE_SIZE)
          const tableHead = (
            <TableHeader className="sticky top-0 z-20" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 5%, white)" }}>
              <TableRow className="border-primary/20 hover:bg-transparent bg-transparent">
                <TableHead className="text-xs text-primary font-bold">Scan Date</TableHead>
                <TableHead className="text-xs text-primary font-bold">User</TableHead>
                <TableHead className="text-xs text-primary font-bold">Lot</TableHead>
                <TableHead className="text-xs text-primary font-bold">Box</TableHead>
                <TableHead className="text-xs text-primary font-bold">ISBN</TableHead>
                <TableHead className="text-xs text-primary font-bold">Pages</TableHead>
                <TableHead className="text-xs text-primary font-bold">
                  <div className="relative left-16">Status</div>
                </TableHead>
                <TableHead className="text-xs text-primary font-bold">
                  <div className="relative left-16">Machine</div>
                </TableHead>
                <TableHead className="text-xs text-primary font-bold text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
          )
          const renderRows = (rows: any[]) => rows.map((item, i) => (
            <TableRow key={i} className="border-border hover:bg-transparent cursor-default h-10">
              <TableCell className="text-xs text-muted-foreground py-0.5">{item.ScanDate ? new Date(item.ScanDate).toLocaleString() : '—'}</TableCell>
              <TableCell className="text-xs font-medium text-card-foreground py-0.5">{item.ScanUser || '—'}</TableCell>
              <TableCell className="text-xs font-semibold text-card-foreground py-0.5">{(enrichedData[item.ISBN]?.lot && enrichedData[item.ISBN]?.lot !== '—') ? enrichedData[item.ISBN].lot : (item.LotNumber || '—')}</TableCell>
              <TableCell className="text-xs text-card-foreground py-0.5">{(enrichedData[item.ISBN]?.box && enrichedData[item.ISBN]?.box !== '—') ? enrichedData[item.ISBN].box : (item.BoxNumber || '—')}</TableCell>
              <TableCell className="text-xs text-muted-foreground py-0.5">{item.ISBN || '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground py-0.5">{item.PageCount || '—'}</TableCell>
              <TableCell className="py-0.5">
                <div className="relative left-16">{getPipelineStatusBadge(item.Status || '')}</div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground py-0.5">
                <div className="relative left-16">{item.MachineName || '—'}</div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground text-right py-0.5">{formatTime(item.Updated)}</TableCell>
            </TableRow>
          ))
          return (
            <>
              {/* Mobile: 5 rows + prev/next */}
              <div className="sm:hidden flex flex-col max-h-[300px]">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    {tableHead}
                    <TableBody>{renderRows(mobileRows)}</TableBody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-white">
                    <button
                      onClick={() => setMobilePage(p => Math.max(0, p - 1))}
                      disabled={mobilePage === 0}
                      className="flex items-center gap-1 text-xs text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {mobilePage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setMobilePage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={mobilePage >= totalPages - 1}
                      className="flex items-center gap-1 text-xs text-muted-foreground disabled:opacity-30 hover:text-foreground transition-colors"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {/* Desktop: max-h for scroll */}
              <div className="hidden sm:block max-h-[300px] overflow-auto">
                <table className="w-full text-sm">
                  {tableHead}
                  <TableBody>{renderRows(scans)}</TableBody>
                </table>
              </div>
            </>
          )
        })()}
      </CardContent>
    </Card>
  )
}
