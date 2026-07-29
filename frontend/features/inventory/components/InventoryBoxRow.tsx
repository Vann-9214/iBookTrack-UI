import { ChevronDown, ChevronRight, Package } from 'lucide-react'
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
  className,
}: {
  box: InventoryBox
  expanded: boolean
  onToggle: () => void
  badge?: React.ReactNode
  date?: Date | null
  action?: React.ReactNode
  lotFallback?: string
  children?: React.ReactNode
  className?: string
}) {
  const bookCount = box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
  return (
    <div
      className={cn(
        'group rounded-2xl shadow-sm transition-all',
        expanded
          ? 'premium-gradient-ui-card--solid premium-gradient-ui-card--static'
          : 'bg-white/80 ring-1 ring-black/5 hover:bg-white',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggle}
            className={cn('shrink-0 transition-colors', expanded ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground')}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', expanded ? 'bg-white/20 text-white' : 'bg-primary/10 ring-1 ring-primary/20 text-primary')}>
            <Package className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            {badge ? (
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cn('text-[13px] font-bold', expanded ? 'text-white' : 'text-foreground')}>BOX {box.box_number}</p>
                {badge}
              </div>
            ) : (
              <p className={cn('text-[13px] font-bold', expanded ? 'text-white' : 'text-foreground')}>BOX {box.box_number}</p>
            )}
            <p className={cn('text-[11px] font-medium', expanded ? 'text-white/80' : 'text-muted-foreground')}>
              {box.lot?.lot_number || lotFallback} · {bookCount} books
            </p>
          </div>
        </div>
        {date && (
          <div className="shrink-0 hidden sm:block text-right mr-2">
            <p className={cn('text-xs', expanded ? 'text-white/80' : 'text-muted-foreground')}>{date.toLocaleDateString()}</p>
            <p className={cn('text-[10px]', expanded ? 'text-white/70' : 'text-muted-foreground/80')}>{date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
          </div>
        )}
        {action}
      </div>
      {expanded && <div className="bg-white p-0">{children}</div>}
    </div>
  )
}
