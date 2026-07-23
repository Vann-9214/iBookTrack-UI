import { BookOpen, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InventoryBox } from '../types/inventory.types'

export function InventoryBoxRow({
  box,
  expanded,
  onToggle,
  badge,
  date,
  action,
  lotFallback = '—',
  children,
}: {
  box: InventoryBox
  expanded: boolean
  onToggle: () => void
  badge?: React.ReactNode
  date?: Date | null
  action?: React.ReactNode
  lotFallback?: string
  children?: React.ReactNode
}) {
  const bookCount = box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggle}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="bg-primary/10 rounded-lg p-2 shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            {badge ? (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
                {badge}
              </div>
            ) : (
              <p className="text-sm font-semibold text-foreground">BOX: {box.box_number}</p>
            )}
            <p className="text-xs text-muted-foreground">
              LOT: {box.lot?.lot_number || lotFallback} · BOOKS: {bookCount} <BookOpen className="inline h-3 w-3 mr-0.5" />
            </p>
          </div>
        </div>
        {date && (
          <div className="shrink-0 hidden sm:block text-right mr-2">
            <p className="text-xs text-muted-foreground">{date.toLocaleDateString()}</p>
            <p className="text-[10px] text-muted-foreground/80">{date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
          </div>
        )}
        {action}
      </div>
      {expanded && <div className="border-t border-border bg-muted/30">{children}</div>}
    </div>
  )
}
