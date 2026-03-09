"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileUp,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Activity,
  Search,
  ArrowUpRight,
  Loader2,
} from "lucide-react"

const transmissionQueue = [
  {
    lotId: "LOT-2024-0891",
    fileSize: "4.2 MB",
    progress: 100,
    status: "verified",
  },
  {
    lotId: "LOT-2024-0890",
    fileSize: "3.8 MB",
    progress: 100,
    status: "verified",
  },
  {
    lotId: "LOT-2024-0889",
    fileSize: "5.1 MB",
    progress: 45,
    status: "sending",
  },
  {
    lotId: "LOT-2024-0888",
    fileSize: "4.0 MB",
    progress: 100,
    status: "failed",
  },
  {
    lotId: "LOT-2024-0887",
    fileSize: "3.5 MB",
    progress: 100,
    status: "verified",
  },
  {
    lotId: "LOT-2024-0886",
    fileSize: "6.2 MB",
    progress: 78,
    status: "sending",
  },
  {
    lotId: "LOT-2024-0885",
    fileSize: "4.8 MB",
    progress: 100,
    status: "verified",
  },
  {
    lotId: "LOT-2024-0884",
    fileSize: "3.9 MB",
    progress: 100,
    status: "failed",
  },
]

const transmissionHistory = [
  { lotId: "LOT-2024-0850", date: "Mar 8, 2026", fileSize: "4.1 MB", status: "verified" },
  { lotId: "LOT-2024-0849", date: "Mar 8, 2026", fileSize: "3.7 MB", status: "verified" },
  { lotId: "LOT-2024-0848", date: "Mar 7, 2026", fileSize: "5.2 MB", status: "verified" },
  { lotId: "LOT-2024-0847", date: "Mar 7, 2026", fileSize: "4.5 MB", status: "failed" },
  { lotId: "LOT-2024-0846", date: "Mar 6, 2026", fileSize: "3.9 MB", status: "verified" },
  { lotId: "LOT-2024-0845", date: "Mar 6, 2026", fileSize: "6.0 MB", status: "verified" },
  { lotId: "LOT-2024-0844", date: "Mar 5, 2026", fileSize: "4.3 MB", status: "verified" },
  { lotId: "LOT-2024-0843", date: "Mar 5, 2026", fileSize: "3.8 MB", status: "verified" },
]

export default function TransmissionMonitorPage() {
  const [historySearch, setHistorySearch] = useState("")

  const totalSent = 847
  const passRate = 99.8
  const uploadSpeed = "12.4 MB/s"

  const failedCount = transmissionQueue.filter((t) => t.status === "failed").length

  const filteredHistory = transmissionHistory.filter((item) =>
    item.lotId.toLowerCase().includes(historySearch.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success gap-1 text-[10px]"
          >
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </Badge>
        )
      case "failed":
        return (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[10px]"
          >
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      case "sending":
        return (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary gap-1 text-[10px]"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Sending
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Header */}
            <header>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Transmission Monitor
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor PDF uploads, hash-check verifications, and transmission history.
              </p>
            </header>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total PDFs Sent Today
                      </p>
                      <p className="text-2xl font-bold text-card-foreground">
                        {totalSent}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Hash-Check Pass Rate
                      </p>
                      <p className="text-2xl font-bold text-card-foreground">
                        {passRate}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                      <Activity className="h-6 w-6 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Active Upload Speed
                      </p>
                      <p className="text-2xl font-bold text-card-foreground">
                        {uploadSpeed}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Queue and History */}
            <Tabs defaultValue="queue" className="w-full">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="queue">Transmission Queue</TabsTrigger>
                  <TabsTrigger value="history">Transmission History</TabsTrigger>
                </TabsList>
                {failedCount > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry All Failed ({failedCount})
                  </Button>
                )}
              </div>

              <TabsContent value="queue" className="mt-4">
                <Card className="border-border bg-card">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-xs text-muted-foreground font-medium">
                            Lot ID
                          </TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">
                            File Size
                          </TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium w-48">
                            Upload Progress
                          </TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">
                            Status
                          </TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium text-right">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transmissionQueue.map((item) => (
                          <TableRow key={item.lotId} className="border-border">
                            <TableCell className="font-mono text-xs text-card-foreground">
                              {item.lotId}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.fileSize}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={item.progress}
                                  className="h-2 flex-1"
                                />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {item.progress}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell className="text-right">
                              {item.status === "failed" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {item.status === "verified" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                >
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-card-foreground">
                        Last 30 Days
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search by Lot ID..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="w-56 pl-9 h-8 text-sm"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-xs text-muted-foreground font-medium">
                            Lot ID
                          </TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">
                            Date
                          </TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium">
                            File Size
                          </TableHead>
                          <TableHead className="text-xs text-muted-foreground font-medium text-right">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.map((item) => (
                          <TableRow key={item.lotId} className="border-border">
                            <TableCell className="font-mono text-xs text-card-foreground">
                              {item.lotId}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.date}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.fileSize}
                            </TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(item.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
