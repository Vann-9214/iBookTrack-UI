import { ChevronDown, ChevronRight, Package, BookOpen, Inbox, Loader2 } from "lucide-react"
import { BoxEntry, BookInBox } from "../types/scan.types"
import { formatBookCount } from "../utils/scan.helpers"
import { ScanBoxBooks } from "./ScanBoxBooks"

interface ScanBoxRowProps {
  box: BoxEntry
  isExpanded: boolean
  onToggle: () => void
  books: BookInBox[]
  loadingBooks: boolean
  receivingBox: string | null
  onOpenConfirm: (box: BoxEntry) => void
}

export function ScanBoxRow({
  box,
  isExpanded,
  onToggle,
  books,
  loadingBooks,
  receivingBox,
  onOpenConfirm,
}: ScanBoxRowProps) {
  const sentSession = box.box_sessions?.find(s => s.status === 'sent')
  const bookCount = formatBookCount(box)

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
        {/* Top row: chevron + icon + info + date */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggle}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="bg-primary/10 rounded-lg p-2 shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Sent from Endorsement</span>
            </div>
            <p className="text-xs text-muted-foreground">LOT: {box.lot?.lot_number || '—'} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" /></p>
          </div>
          {sentSession?.endorsement_time_send && (
            <div className="shrink-0 hidden sm:block text-right mr-2">
              <p className="text-xs text-muted-foreground">{new Date(sentSession.endorsement_time_send).toLocaleDateString()}</p>
              <p className="text-[10px] text-muted-foreground/80">{new Date(sentSession.endorsement_time_send).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
            </div>
          )}
        </div>
        {/* Receive Box button: full-width on mobile */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenConfirm(box) }}
          disabled={receivingBox === box.id}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
        >
          {receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
          {receivingBox === box.id ? 'Receiving...' : 'Receive Box'}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border px-5 py-3 bg-muted/30 max-h-[300px] overflow-y-auto">
          <ScanBoxBooks books={books} loading={loadingBooks} />
        </div>
      )}
    </div>
  )
}
