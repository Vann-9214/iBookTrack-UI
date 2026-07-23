import { BookOpen, ChevronDown, ChevronRight, ClipboardList, Loader2, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { InventoryBookList } from './InventoryBookList'
import type { BookInBox, InventoryBox } from '../types/inventory.types'

export function InventoryVerificationBoxList({
  boxes,
  expandedBoxId,
  booksByBox,
  loadingBoxId,
  onToggle,
  onStartSession,
  loadingStartSession,
  sessionOngoing = false,
}: {
  boxes: InventoryBox[]
  expandedBoxId: string | null
  booksByBox: Record<string, BookInBox[]>
  loadingBoxId: string | null
  onToggle: (boxId: string) => void
  onStartSession: (box: InventoryBox) => void
  loadingStartSession: boolean
  sessionOngoing?: boolean
}) {
  const isMobile = useIsMobile()
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-2 pb-2">
          {boxes.map((box) => {
            const isExpanded = expandedBoxId === box.id
            const rowBooks = booksByBox[box.id] || []
            const isLoadingBooks = loadingBoxId === box.id
            const bookCount = box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
            const warehouseTime = sessionOngoing ? undefined : box.box_sessions?.[0]?.inventory_time_received
            const created = warehouseTime ? new Date(warehouseTime) : (box.created_at ? new Date(box.created_at) : null)
            return (
              <div key={box.id} className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggle(box.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggle(box.id)}>
                      {sessionOngoing ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">Session Ongoing</span>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        LOT: {box.lot?.lot_number || (sessionOngoing ? '--' : '—')} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" />
                      </p>
                    </div>
                    {!sessionOngoing && created && (
                      <div className="shrink-0 hidden sm:block text-right mr-2">
                        <p className="text-xs text-muted-foreground">{created.toLocaleDateString()}</p>
                        <p className="text-[10px] text-muted-foreground/80">{created.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                      </div>
                    )}
                  </div>
                  {!sessionOngoing && !isMobile && (
                    <button
                      onClick={() => onStartSession(box)}
                      disabled={loadingStartSession}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
                    >
                      {loadingStartSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                      {loadingStartSession ? 'Starting...' : 'Start Session'}
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30">
                    <InventoryBookList books={rowBooks} box={box} loading={isLoadingBooks} showFlags={!sessionOngoing} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
