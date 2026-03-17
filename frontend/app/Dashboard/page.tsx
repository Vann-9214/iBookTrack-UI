"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { StatsBar } from "@/components/stats-bar"
import { ActivePipeline } from "@/components/active-pipeline"
import { TransmissionQueue } from "@/components/transmission-queue"
import { UnaccountedBooks } from "@/components/missing-item-log"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search } from "lucide-react"
import { DashboardMain } from "./DashboardMain"

export default function DashboardPage() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchType, setSearchType] = useState<"isbn" | "lot">("lot")
  const [searchValue, setSearchValue] = useState("")
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")
  const [isRange, setIsRange] = useState(false)
  const [currentLot, setCurrentLot] = useState("34")
  const [displayRange, setDisplayRange] = useState<string | null>(null)

  const handleSearch = () => {
    if (isRange && rangeStart && rangeEnd) {
      setDisplayRange(`Lot ${rangeStart} - Lot ${rangeEnd}`)
      setCurrentLot("")
    } else if (searchType === "lot" && searchValue) {
      setCurrentLot(searchValue)
      setDisplayRange(null)
    }
    setSearchOpen(false)
  }

  const displayText = displayRange || (currentLot ? `Lot ${currentLot}` : "")
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      {/* Main Content */}
      <DashboardMain>
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Page Header */}
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Command Center
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real-time overview of the 8-step pipeline, transmissions, and warehouse activity.
                </p>
              </div>
              <Dialog open={searchOpen} onOpenChange={setSearchOpen} modal={false}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle>Search Dashboard</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        variant={searchType === "isbn" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSearchType("isbn")}
                        className="flex-1"
                      >
                        ISBN
                      </Button>
                      <Button
                        variant={searchType === "lot" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSearchType("lot")}
                        className="flex-1"
                      >
                        Lot
                      </Button>
                    </div>

                    {searchType === "lot" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="range"
                          checked={isRange}
                          onChange={(e) => setIsRange(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <label htmlFor="range" className="text-sm font-medium">
                          Search by Range
                        </label>
                      </div>
                    )}

                    {isRange && searchType === "lot" ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">From Lot</label>
                          <Input
                            placeholder="e.g., 35"
                            value={rangeStart}
                            onChange={(e) => setRangeStart(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">To Lot</label>
                          <Input
                            placeholder="e.g., 36"
                            value={rangeEnd}
                            onChange={(e) => setRangeEnd(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">
                          {searchType === "isbn" ? "ISBN Number" : "Lot Number"}
                        </label>
                        <Input
                          placeholder={searchType === "isbn" ? "e.g., 978-0-13-468599-1" : "e.g., 34"}
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                        />
                      </div>
                    )}

                    <Button onClick={handleSearch} className="w-full">
                      Apply Search
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </header>

            {/* Top Stats Bar */}
            <StatsBar />

            {/* Active Pipeline Flowchart */}
            <ActivePipeline currentLot={displayText} />

            {/* Bottom Split: Transmission Queue & Unaccounted Books */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <TransmissionQueue />
              <UnaccountedBooks />
            </div>
          </div>
        </ScrollArea>
      </DashboardMain>
    </div>
  )
}
