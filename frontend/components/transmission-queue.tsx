'use client'

import { useEffect, useMemo, useState } from "react"
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
import { CheckCircle2, XCircle, Loader2, Activity } from "lucide-react"
import { authFetch } from "@/lib/auth-api"
import { useBrand } from "@/hooks/use-brand"
import { Skeleton } from "@/components/ui/skeleton"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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

  if (stateUpper === 'COMPLETED') return (
    <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-[10px] uppercase font-semibold">
      <CheckCircle2 className="h-3 w-3" /> {formattedStage} COMPLETED
    </Badge>
  )
  if (stateUpper === 'FAILED') return (
    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[10px] uppercase font-semibold">
      <XCircle className="h-3 w-3" /> {formattedStage} FAILED
    </Badge>
  )
  return (
    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary gap-1 text-[10px] uppercase font-semibold">
      <Loader2 className="h-3 w-3 animate-spin" /> {formattedStage} ONGOING
    </Badge>
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

export function TransmissionQueue({ scans: propScans, loading: propLoading = false }: TransmissionQueueProps) {
  const { brand } = useBrand()
  const [fetchedScans, setFetchedScans] = useState<any[]>([])
  const [loading, setLoading] = useState(!propScans)

  const scans = useMemo(
    () => (propScans || fetchedScans).slice(0, 10),
    [propScans, fetchedScans]
  )

  const fetchLive = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`${API_URL}/api/scanning/live?location=${brand}`)
      const data = await res.json()
      if (data.success && data.recentScans) {
        setFetchedScans(data.recentScans)
      }
    } catch (e) {
      console.error('Failed to fetch live scans:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (propScans) return
    fetchLive()
  }, [brand])

  const ongoingCount = scans.filter(s => s.Status?.toUpperCase().includes('ONGOING')).length

  return (
    <Card className="border-border bg-card flex flex-col overflow-hidden p-0 h-full">
      {/* Blue header - sticky */}
      <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border-b border-blue-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Live Transmission Feed</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-xs text-blue-500 font-medium">
                {ongoingCount > 0 ? `${ongoingCount} actively processing` : 'actively processing'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {propLoading || loading ? (
            <Skeleton className="h-6 w-16 rounded-full bg-muted-foreground/20" />
          ) : (
            <Badge variant="outline" className="border-blue-300 bg-white text-blue-600 text-[11px] font-semibold px-2.5 whitespace-nowrap">
              {`${scans.length} books`}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="flex-1 p-0 min-h-0">
        {propLoading || loading ? (
          <div className="h-full overflow-hidden px-4 py-3">
            <div className="flex gap-3 mb-3">
              <Skeleton className="h-8 w-28 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-24 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-32 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-20 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-24 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-28 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-24 rounded bg-muted-foreground/20" />
              <Skeleton className="h-8 w-20 rounded bg-muted-foreground/20" />
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                <Skeleton className="h-4 w-20 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-24 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-28 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-36 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-16 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-28 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-24 rounded bg-muted-foreground/20" />
                <Skeleton className="h-4 w-20 ml-auto rounded bg-muted-foreground/20" />
              </div>
            ))}
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-muted-foreground">No scan data for today</p>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium">Scan Date</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">User</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Box</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">ISBN</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Pages</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Machine</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((item, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">{item.ScanDate ? new Date(item.ScanDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-xs font-medium text-card-foreground">{item.ScanUser || '—'}</TableCell>
                    <TableCell className="text-xs text-card-foreground">{item.BoxNumber || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.ISBN || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.PageCount || '—'}</TableCell>
                    <TableCell>{getPipelineStatusBadge(item.Status || '')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.MachineName || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right">{formatTime(item.Updated)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}