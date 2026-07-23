import React from "react"
import { useUser } from "@/hooks/use-user"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Inbox, Loader2, Package } from "lucide-react"
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

  return (
    <Card className={cn("gap-0 h-fit max-h-[640px] rounded-2xl border shadow-sm ring-1 transition-all duration-300", brand === 'jaguar'
      ? "border-emerald-200/60 ring-emerald-100/50 hover:shadow-emerald-200/50"
      : "border-blue-200/60 ring-blue-100/50 hover:shadow-blue-200/50"
    )}>
      <CardHeader className={cn("flex min-h-[72px] flex-row items-center justify-between -mt-6 mb-3 px-6 py-4 rounded-t-2xl border-b", brand === 'jaguar'
        ? "bg-gradient-to-br from-emerald-50 to-green-100/40 border-b-emerald-200/70"
        : "bg-gradient-to-br from-blue-50 to-indigo-100/40 border-b-blue-200/70"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg", brand === 'jaguar'
            ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25"
            : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25"
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
            <Package className="h-7 w-7 opacity-30" />
            <p className="text-xs">{activeSearchQuery ? 'No matching unassigned boxes' : 'No unassigned boxes'}</p>
            <p className="text-[10px] max-w-[200px]">{activeSearchQuery ? 'Try a different full ISBN, Box [number], or Lot [number].' : 'Scan-stage boxes with completed transmission will appear here.'}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-2 min-h-0">
            {filteredReadyBoxes.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => isAuthorized && selectReadyBox(b)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                  selectedReadyBoxIds.has(b.id) || activeSearchQuery
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border bg-muted/40",
                  isAuthorized ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
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
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
