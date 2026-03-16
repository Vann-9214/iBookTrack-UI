"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  Scan,
  Package,
  Scissors,
  CheckCircle,
  Camera,
  Shield,
  Radio,
  Warehouse,
  ArrowRight,
} from "lucide-react"

const stations = [
  {
    name: "Intake",
    icon: Package,
    activeLots: 3,
    arriving: [
      { lotId: "Lot-33", boxId: "B001" },
      { lotId: "Lot-33", boxId: "B002" },
    ],
  },
  {
    name: "Cut",
    icon: Scissors,
    activeLots: 2,
    arriving: [
      { lotId: "Lot-32", boxId: "B015" },
    ],
  },
  {
    name: "QC",
    icon: CheckCircle,
    activeLots: 4,
    arriving: [
      { lotId: "Lot-31", boxId: "B008" },
      { lotId: "Lot-31", boxId: "B009" },
      { lotId: "Lot-30", boxId: "B022" },
    ],
  },
  {
    name: "Scan",
    icon: Camera,
    activeLots: 5,
    arriving: [
      { lotId: "Lot-30", boxId: "B011" },
    ],
  },
  {
    name: "Validation",
    icon: Shield,
    activeLots: 2,
    arriving: [],
  },
  {
    name: "QA",
    icon: CheckCircle,
    activeLots: 3,
    arriving: [
      { lotId: "Lot-29", boxId: "B003" },
      { lotId: "Lot-29", boxId: "B004" },
    ],
  },
  {
    name: "Transmit",
    icon: Radio,
    activeLots: 1,
    arriving: [
      { lotId: "Lot-28", boxId: "B019" },
    ],
  },
  {
    name: "Storage",
    icon: Warehouse,
    activeLots: 8,
    arriving: [],
  },
]

const recentTransitions = [
  { boxId: "B001", fromStation: "Cut", toStation: "QC", time: "2 min ago" },
  { boxId: "B015", fromStation: "Intake", toStation: "Cut", time: "5 min ago" },
  { boxId: "B008", fromStation: "Scan", toStation: "Validation", time: "8 min ago" },
  { boxId: "B022", fromStation: "QC", toStation: "Scan", time: "12 min ago" },
  { boxId: "B011", fromStation: "Validation", toStation: "QA", time: "15 min ago" },
  { boxId: "B003", fromStation: "QA", toStation: "Transmit", time: "20 min ago" },
  { boxId: "B019", fromStation: "Transmit", toStation: "Storage", time: "25 min ago" },
]

export default function StationCheckpointsPage() {
  const [searchValue, setSearchValue] = useState("")

  const handleReceive = (stationName: string, lotId: string, boxId: string) => {
    console.log(`Received ${lotId} ${boxId} at ${stationName}`)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Station Checkpoint Monitor
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track the flow of boxes through the physical pipeline stages.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Scan className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Scan Box Barcode..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-64 pl-9"
                  />
                </div>
              </div>
            </header>

            {/* Active Handshakes Grid */}
            <section>
              <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Active Handshakes
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stations.map((station) => (
                  <Card key={station.name} className="border-border bg-card">
                    <CardHeader className="flex flex-row items-center gap-3 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <station.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold text-card-foreground">
                          {station.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {station.activeLots} active lots
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {station.arriving.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Arriving:
                          </p>
                          {station.arriving.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
                            >
                              <span className="text-xs font-mono text-card-foreground">
                                {item.lotId} {item.boxId}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() =>
                                  handleReceive(station.name, item.lotId, item.boxId)
                                }
                              >
                                Receive
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-md border border-dashed border-border py-4">
                          <span className="text-xs text-muted-foreground">
                            No incoming boxes
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recent Transitions Table */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-card-foreground">
                  Recent Transitions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs text-muted-foreground font-medium">
                        Box ID
                      </TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">
                        From Station
                      </TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">
                        To Station
                      </TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium text-right">
                        Time Received
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransitions.map((transition, idx) => (
                      <TableRow key={idx} className="border-border">
                        <TableCell className="font-mono text-xs text-card-foreground">
                          {transition.boxId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal bg-secondary text-secondary-foreground"
                          >
                            {transition.fromStation}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal border-primary/30 bg-primary/10 text-primary"
                          >
                            {transition.toStation}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right">
                          {transition.time}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
