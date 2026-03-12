"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { TopBar } from "@/components/top-bar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"

const commonIssues = [
  { value: "bent-page", label: "Bent Page" },
  { value: "missing-content", label: "Missing Content" },
  { value: "blurred-text", label: "Blurred Text" },
  { value: "torn-page", label: "Torn Page" },
  { value: "water-damage", label: "Water Damage" },
  { value: "ink-smudge", label: "Ink Smudge" },
  { value: "binding-issue", label: "Binding Issue" },
  { value: "wrong-orientation", label: "Wrong Orientation" },
]

const mockPages = Array.from({ length: 50 }, (_, i) => ({
  pageNumber: i + 1,
  hasIssue: [5, 12, 23, 34].includes(i + 1),
}))

export default function QualityCheckingPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIssue, setSelectedIssue] = useState("")
  const [customIssue, setCustomIssue] = useState("")
  const [remarks, setRemarks] = useState("")

  const currentPageData = mockPages[currentPage - 1]

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < mockPages.length) setCurrentPage(currentPage + 1)
  }

  const handleSync = () => {
    const issueToSync = selectedIssue === "__other__" ? customIssue.trim() : selectedIssue
    console.log("Syncing to backend:", { selectedIssue: issueToSync, remarks })
  }

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRemarks(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex flex-1 flex-col min-h-0 p-6 lg:p-8 gap-6">
          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Quality Checking
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Perform page-by-page audits and log remarks for quality control.
            </p>
          </header>

          {/* Split Screen Layout */}
          <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-card">
            {/* Left: Book Viewer */}
            <div className="flex flex-1 flex-col border-r border-border">
              {/* Viewer Toolbar */}
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page{" "}
                    <span className="font-medium text-foreground">
                      {currentPage}
                    </span>{" "}
                    of {mockPages.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleNextPage}
                    disabled={currentPage === mockPages.length}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Book Viewer Area */}
              <ScrollArea className="flex-1 h-0 min-h-0">
                <div className="flex h-full items-center justify-center p-8">
                  <div className="relative flex aspect-[3/4] w-full max-w-md items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <FileText className="h-16 w-16 opacity-50" />
                      <div className="text-center">
                        <p className="font-medium text-foreground">
                          Page {currentPage}
                        </p>
                        <p className="text-sm">
                          Digital book content would render here
                        </p>
                      </div>
                    </div>
                    {currentPageData?.hasIssue && (
                      <Badge
                        variant="outline"
                        className="absolute top-4 right-4 border-warning/30 bg-warning/10 text-warning gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Right: Audit Controls Sidebar */}
            <div className="w-80 shrink-0 lg:w-96">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-6 p-6">
                  {/* Book Info */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-card-foreground">
                        Book Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Book Title
                        </label>
                        <Input
                          value="Operations Manual v3.2"
                          readOnly
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          ISBN
                        </label>
                        <Input
                          value="978-3-16-148410-0"
                          readOnly
                          className="mt-1.5 font-mono"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Audit Controls */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-card-foreground">
                        Audit Controls
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Common Issues
                        </label>
                        <select
                          value={selectedIssue}
                          onChange={(e) => {
                            const value = e.target.value
                            setSelectedIssue(value)
                            if (value !== "__other__") setCustomIssue("")
                          }}
                          className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                        >
                          <option value="" disabled>
                            Select an issue...
                          </option>
                          {commonIssues.map((issue) => (
                            <option key={issue.value} value={issue.value}>
                              {issue.label}
                            </option>
                          ))}
                          <option value="__other__">Other (type custom issue)</option>
                        </select>
                        {selectedIssue === "__other__" && (
                          <Input
                            value={customIssue}
                            onChange={(e) => setCustomIssue(e.target.value)}
                            placeholder="Type the specific issue..."
                            className="mt-2"
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Specific Remarks
                        </label>
                        <Textarea
                          placeholder="Add detailed notes about this page..."
                          value={remarks}
                          onChange={handleRemarksChange}
                          wrap="soft"
                          className="mt-1.5 min-h-[100px] max-h-[220px] w-full resize-none overflow-x-hidden overflow-y-auto [field-sizing:fixed] [word-break:break-all]"
                        />
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={handleSync}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Sync to Backend
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Page Status */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-card-foreground">
                        Current Page Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {currentPageData?.hasIssue ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <span className="text-sm text-warning">
                              Issue flagged on this page
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span className="text-sm text-success">
                              No issues detected
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
