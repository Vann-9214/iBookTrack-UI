import React, { useState } from "react"
import { useUser } from "@/hooks/use-user"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Inbox, Loader2, Package, BookOpen, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReadyBox } from "../types/locator.types"

interface ReadyBoxListProps {
  brand: string
  filteredReadyBoxes: ReadyBox[]
  loadingReady: boolean
  activeSearchQuery: string
  selectedReadyBoxIds: Set<string>
  selectReadyBox: (box: ReadyBox) => void
}

export const ReadyBoxList: React.FC<ReadyBoxListProps> = ({
  brand,
  filteredReadyBoxes,
  loadingReady,
  activeSearchQuery,
  selectedReadyBoxIds,
  selectReadyBox
}) => {
  const { user } = useUser()
  const isAuthorized = user?.role === 'supervisor' || user?.role === 'storage'
  const [viewingBox, setViewingBox] = useState<ReadyBox | null>(null)

  return (
    <>
      <Card className={cn("gap-0 h-fit max-h-[640px] rounded-2xl border shadow-sm ring-1 transition duration-300", brand === 'jaguar'
        ? "border-emerald-200/60 ring-emerald-100/50 hover:shadow-emerald-200/50"
        : "border-blue-200/60 ring-blue-100/50 hover:shadow-blue-200/50"
      )}>
        <CardHeader className={cn("flex min-h-[72px] flex-row items-center justify-between -mt-6 mb-3 px-6 py-4 rounded-t-2xl border-b", brand === 'jaguar'
          ? "bg-emerald-600/40 border-b-emerald-200/70"
          : "bg-gradient-to-br from-blue-50 to-indigo-100/40 border-b-blue-200/70"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg", brand === 'jaguar'
              ? "bg-emerald-600 shadow-emerald-500/25"
              : "bg-blue-600 shadow-blue-500/25"
            )}>
              <Inbox className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Unassigned Boxes</CardTitle>
          </div>
          <span className={cn("inline-flex h-5 min-w-[1.25rem] self-center items-center justify-center rounded-full px-1.5 text-[10px] font-bold", brand === 'jaguar'
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-blue-500/10 text-blue-600"
          )}>
            {filteredReadyBoxes.length}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {loadingReady ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading unassigned boxes…</span>
            </div>
          ) : filteredReadyBoxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
              <Package className={cn("h-7 w-7", brand === 'jaguar' ? "text-emerald-500" : "text-blue-500")} />
              <p className="text-xs">{activeSearchQuery ? 'No matching unassigned boxes' : 'No unassigned boxes'}</p>
              <p className="text-[10px] max-w-[200px]">{activeSearchQuery ? 'Try a different full ISBN, Box [number], or Lot [number].' : 'Scan-stage boxes with completed transmission will appear here.'}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-2 min-h-0">
              {filteredReadyBoxes.map(b => (
                <div
                  key={b.id}
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                      setViewingBox(b)
                    } else if (isAuthorized) {
                      selectReadyBox(b)
                    }
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer",
                    selectedReadyBoxIds.has(b.id) || activeSearchQuery
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border bg-muted/40 hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">BOX: {b.box_number}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        {b.lot_number && (
                          <span className="truncate">LOT: {b.lot_number}</span>
                        )}
                        {b.lot_number && <span>•</span>}
                        <span className="whitespace-nowrap">BOOKS: {b.books.length}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setViewingBox(b)
                    }}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="View box contents"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Box Contents Viewer Modal */}
      {viewingBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewingBox(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-md max-h-[85vh] flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">BOX: {viewingBox.box_number}</h3>
                  {viewingBox.lot_number && (
                    <p className="text-xs text-muted-foreground truncate">{viewingBox.lot_number.toLowerCase().startsWith('lot') ? viewingBox.lot_number : `Lot ${viewingBox.lot_number}`}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setViewingBox(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none p-1 shrink-0">✕</button>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                {viewingBox.books.length} Scanned Book{viewingBox.books.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[360px] border border-border rounded-xl p-2 bg-muted/20 space-y-1.5">
              {viewingBox.books.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground italic">
                  No scanned books recorded in this box
                </div>
              ) : (
                viewingBox.books.map((bk, i) => (
                  <div key={i} className="flex flex-col p-2.5 rounded-lg border border-border bg-card shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-mono text-primary font-bold">
                      <span>ISBN: {bk.isbn}</span>
                    </div>
                    {bk.title && <p className="text-xs text-foreground font-medium mt-1 truncate">{bk.title}</p>}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewingBox(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
