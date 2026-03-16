"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, MapPin, Package, X } from "lucide-react"
import { cn } from "@/lib/utils"

type RackLevel = {
  rackId: string
  level: number
  capacity: number
  used: number
  contents: Array<{
    boxId: string
    bookTitle: string
  }>
}

const warehouseData: RackLevel[] = [
  {
    rackId: "A",
    level: 1,
    capacity: 20,
    used: 18,
    contents: [
      { boxId: "B001", bookTitle: "Operations Manual v3.2" },
      { boxId: "B002", bookTitle: "Safety Handbook 2024" },
      { boxId: "B003", bookTitle: "Equipment Log #47" },
    ],
  },
  {
    rackId: "A",
    level: 2,
    capacity: 20,
    used: 12,
    contents: [
      { boxId: "B004", bookTitle: "Inventory Sheet B-12" },
      { boxId: "B005", bookTitle: "QA Checklist Rev.8" },
    ],
  },
  {
    rackId: "A",
    level: 3,
    capacity: 20,
    used: 5,
    contents: [{ boxId: "B006", bookTitle: "Training Manual 2024" }],
  },
  {
    rackId: "A",
    level: 4,
    capacity: 20,
    used: 0,
    contents: [],
  },
  {
    rackId: "B",
    level: 1,
    capacity: 20,
    used: 20,
    contents: [
      { boxId: "B007", bookTitle: "Procedure Guide A" },
      { boxId: "B008", bookTitle: "Procedure Guide B" },
    ],
  },
  {
    rackId: "B",
    level: 2,
    capacity: 20,
    used: 15,
    contents: [{ boxId: "B009", bookTitle: "Reference Book Set 1" }],
  },
  {
    rackId: "B",
    level: 3,
    capacity: 20,
    used: 8,
    contents: [{ boxId: "B010", bookTitle: "Archive Collection 2023" }],
  },
  {
    rackId: "B",
    level: 4,
    capacity: 20,
    used: 3,
    contents: [{ boxId: "B011", bookTitle: "Maintenance Log #12" }],
  },
  {
    rackId: "C",
    level: 1,
    capacity: 20,
    used: 16,
    contents: [
      { boxId: "B012", bookTitle: "Technical Spec v2.0" },
      { boxId: "B013", bookTitle: "User Guide 2024" },
    ],
  },
  {
    rackId: "C",
    level: 2,
    capacity: 20,
    used: 10,
    contents: [{ boxId: "B014", bookTitle: "Compliance Docs" }],
  },
  {
    rackId: "C",
    level: 3,
    capacity: 20,
    used: 7,
    contents: [{ boxId: "B015", bookTitle: "Quality Standards" }],
  },
  {
    rackId: "C",
    level: 4,
    capacity: 20,
    used: 2,
    contents: [{ boxId: "B016", bookTitle: "Emergency Procedures" }],
  },
  {
    rackId: "D",
    level: 1,
    capacity: 20,
    used: 19,
    contents: [
      { boxId: "B017", bookTitle: "Financial Reports 2023" },
      { boxId: "B018", bookTitle: "Audit Documents" },
    ],
  },
  {
    rackId: "D",
    level: 2,
    capacity: 20,
    used: 14,
    contents: [{ boxId: "B019", bookTitle: "HR Policies" }],
  },
  {
    rackId: "D",
    level: 3,
    capacity: 20,
    used: 6,
    contents: [{ boxId: "B020", bookTitle: "Legal Documents" }],
  },
  {
    rackId: "D",
    level: 4,
    capacity: 20,
    used: 1,
    contents: [{ boxId: "B021", bookTitle: "Contract Archive" }],
  },
]

const racks = ["A", "B", "C", "D"]
const levels = [4, 3, 2, 1]

export default function WarehouseLocatorPage() {
  const [searchValue, setSearchValue] = useState("")
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null)
  const [selectedCell, setSelectedCell] = useState<RackLevel | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSearch = () => {
    if (!searchValue.trim()) {
      setHighlightedCell(null)
      return
    }

    const searchLower = searchValue.toLowerCase()
    const found = warehouseData.find(
      (cell) =>
        cell.contents.some(
          (item) =>
            item.boxId.toLowerCase().includes(searchLower) ||
            item.bookTitle.toLowerCase().includes(searchLower)
        )
    )

    if (found) {
      setHighlightedCell(`${found.rackId}-${found.level}`)
    } else {
      setHighlightedCell(null)
    }
  }

  const handleCellClick = (rackId: string, level: number) => {
    const cell = warehouseData.find(
      (c) => c.rackId === rackId && c.level === level
    )
    if (cell) {
      setSelectedCell(cell)
      setDialogOpen(true)
    }
  }

  const getCellData = (rackId: string, level: number) => {
    return warehouseData.find((c) => c.rackId === rackId && c.level === level)
  }

  const getCapacityColor = (used: number, capacity: number) => {
    const percent = (used / capacity) * 100
    if (percent >= 90) return "bg-destructive/20 border-destructive/40"
    if (percent >= 70) return "bg-warning/20 border-warning/40"
    if (percent > 0) return "bg-success/20 border-success/40"
    return "bg-muted border-border"
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Header */}
            <header>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Warehouse Locator
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Search by ISBN or Box ID to locate items in storage.
              </p>
            </header>

            {/* Search Bar */}
            <div className="mx-auto flex w-full max-w-xl items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter ISBN or Box ID (e.g., B001, 978-3-16...)"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-12 text-base"
                />
              </div>
              <Button onClick={handleSearch} className="h-12 px-6">
                Search
              </Button>
              {highlightedCell && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => {
                    setSearchValue("")
                    setHighlightedCell(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Legend */}
            <div className="mx-auto flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-success/20 border border-success/40" />
                <span>{"< 70% Full"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-warning/20 border border-warning/40" />
                <span>70-90% Full</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-destructive/20 border border-destructive/40" />
                <span>{"> 90% Full"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-muted border border-border" />
                <span>Empty</span>
              </div>
            </div>

            {/* Warehouse Grid */}
            <Card className="mx-auto w-full max-w-3xl border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-sm font-semibold text-card-foreground">
                  Warehouse Layout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {/* Rack Labels */}
                  <div className="flex items-center gap-2">
                    <div className="w-16 text-xs font-medium text-muted-foreground text-right pr-2">
                      Level
                    </div>
                    {racks.map((rack) => (
                      <div
                        key={rack}
                        className="flex-1 text-center text-sm font-semibold text-foreground"
                      >
                        Rack {rack}
                      </div>
                    ))}
                  </div>

                  {/* Grid Rows (Levels) */}
                  {levels.map((level) => (
                    <div key={level} className="flex items-center gap-2">
                      <div className="w-16 text-xs font-medium text-muted-foreground text-right pr-2">
                        {level}
                      </div>
                      {racks.map((rack) => {
                        const cell = getCellData(rack, level)
                        const isHighlighted =
                          highlightedCell === `${rack}-${level}`
                        return (
                          <button
                            key={`${rack}-${level}`}
                            onClick={() => handleCellClick(rack, level)}
                            className={cn(
                              "flex-1 aspect-square rounded-lg border-2 transition-all duration-200 flex items-center justify-center",
                              cell
                                ? getCapacityColor(cell.used, cell.capacity)
                                : "bg-muted border-border",
                              isHighlighted &&
                                "ring-4 ring-primary ring-offset-2 ring-offset-background scale-105",
                              "hover:scale-105 hover:shadow-md cursor-pointer"
                            )}
                          >
                            {cell && cell.used > 0 && (
                              <div className="flex flex-col items-center gap-0.5">
                                <Package className="h-5 w-5 text-foreground/70" />
                                <span className="text-[10px] font-medium text-foreground/70">
                                  {cell.used}/{cell.capacity}
                                </span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Search Result Indicator */}
            {highlightedCell && (
              <div className="mx-auto flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">
                  Item found at{" "}
                  <span className="font-semibold">
                    Rack {highlightedCell.split("-")[0]} - Level{" "}
                    {highlightedCell.split("-")[1]}
                  </span>
                </span>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {dialogOpen && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-black/30" />
      )}

      {/* Detail Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} modal={false}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Rack {selectedCell?.rackId} - Level {selectedCell?.level}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            {/* Capacity */}
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Capacity</span>
                <span className="font-medium text-foreground">
                  {selectedCell?.used} / {selectedCell?.capacity} boxes
                </span>
              </div>
              <Progress
                value={
                  selectedCell
                    ? (selectedCell.used / selectedCell.capacity) * 100
                    : 0
                }
                className="h-2"
              />
            </div>

            {/* Contents */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Current Contents
              </p>
              {selectedCell?.contents && selectedCell.contents.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {selectedCell.contents.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {item.bookTitle}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {item.boxId}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-secondary text-secondary-foreground"
                      >
                        Stored
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-md border border-dashed border-border py-6">
                  <span className="text-sm text-muted-foreground">
                    This shelf is empty
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
