'use client'

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { CheckCircle2, RotateCcw, RefreshCw } from "lucide-react"
import { authFetch } from "@/lib/auth-api"
import { useBrand } from "@/hooks/use-brand"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

function getStatusBadge(status: string) {
  if (!status) return null
  const s = status.toUpperCase()
  if (s.includes('COMPLETED')) {
    return (
      <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-[10px]">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </Badge>
    )
  }
  if (s.includes('ONGOING')) {
    return (
      <Badge variant="outline" className="border-blue-400/30 bg-blue-400/10 text-blue-500 gap-1 text-[10px]">
        <RotateCcw className="h-3 w-3" /> Ongoing
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[10px]">
      {status}
    </Badge>
  )
}

function formatTime(val: string) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function TransmissionQueue() {
  const { brand } = useBrand()
  const [scans, setScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchLive = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/scanning/live?location=${brand}`)
      const data = await res.json()
      if (data.success && data.recentScans) {
        setScans(data.recentScans.slice(0, 10))
        setLastUpdated(new Date().toLocaleTimeString())
      }
    } catch (e) {
      console.error('Failed to fetch live scans:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLive()
    const interval = setInterval(fetchLive, 8000)
    return () => clearInterval(interval)
  }, [brand])

  const ongoingCount = scans.filter(s => s.Status?.toUpperCase().includes('ONGOING')).length

  return (
    <Card className="border-border bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Live Transmission Feed
        </CardTitle>
        <div className="flex items-center gap-2">
          {ongoingCount > 0 && (
            <Badge variant="outline" className="border-blue-400/30 bg-blue-400/10 text-blue-500 text-xs">
              {ongoingCount} Ongoing
            </Badge>
          )}
          <button onClick={fetchLive} className="text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {lastUpdated && <span className="text-[10px] text-muted-foreground">{lastUpdated}</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">Loading...</div>
        ) : scans.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">No scan data for today</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">Scan Date</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">User</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Box</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">ISBN</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-center">Pages</TableHead>
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
                  <TableCell className="text-xs text-muted-foreground text-center">{item.PageCount || '—'}</TableCell>
                  <TableCell>{getStatusBadge(item.Status || '')}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.MachineName || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right">{formatTime(item.Updated)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
