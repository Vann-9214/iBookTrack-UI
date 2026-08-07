import { ChevronDown, ChevronRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InventoryBox } from '../types/inventory.types'

export function InventoryBoxRow({
  box,
  expanded,
  onToggle,
  badge,
  date,
  sender,
  completedBy,
  receivedBy,
  action,
  lotFallback = '—',
  children,
  className,
  absoluteIndex,
}: {
  box: InventoryBox
  expanded: boolean
  onToggle: () => void
  badge?: React.ReactNode
  date?: Date | null
  sender?: string | null
  completedBy?: string | null
  receivedBy?: string | null
  action?: React.ReactNode
  lotFallback?: string
  children?: React.ReactNode
  className?: string
  absoluteIndex?: number
}) {
  const bookCount = box.box_sessions?.[0]?.total_scanned_books ?? box.total_expected_books ?? 0
  return (
    <div className={cn("transition-colors", expanded ? "bg-white/60" : "", className)}>
      <div
        className={cn(
          'w-full grid grid-cols-12 gap-2 sm:gap-3 items-center px-3 sm:px-4 py-1.5 sm:py-2 text-left transition duration-150 group cursor-pointer',
          expanded
            ? 'text-white shadow-lg shadow-black/10 premium-gradient-ui-card--solid'
            : 'hover:bg-primary/5'
        )}
        onClick={onToggle}
      >
        {/* Index */}
        <div className="col-span-1 flex justify-start items-center">
          <span className={cn("text-[10px] sm:text-[11px] font-black tabular-nums transition-colors", expanded ? "text-white/90" : "text-primary")}>
            {absoluteIndex ? `#${absoluteIndex}` : ''}
          </span>
        </div>

        {/* Box Name / Badge */}
        <div className="col-span-3 sm:col-span-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[11px] sm:text-[12px] font-bold truncate block transition-colors", expanded ? "text-white" : "text-gray-800 group-hover:text-black")}>
              BOX {box.box_number}
            </span>
            {badge}
          </div>
        </div>

        {/* Details (hidden on mobile) */}
        <div className="hidden sm:flex sm:col-span-3 min-w-0 flex-col justify-center">
          <span className={cn("text-[12px] truncate transition-colors font-medium", expanded ? "text-white/80" : "text-muted-foreground")}>
            {box.lot?.lot_number || lotFallback}
          </span>
          {(date || sender || completedBy || receivedBy) && (
            <span className={cn("text-[10px] truncate transition-colors font-medium", expanded ? "text-white/90" : "text-muted-foreground")}>
              {sender && `by ${sender}`}
              {completedBy && `by ${completedBy}`}
              {receivedBy && `by ${receivedBy}`}
              {date && ` · ${date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
            </span>
          )}
        </div>

        {/* Book count */}
        <div className="col-span-2 sm:col-span-2 flex justify-center">
          <div className={cn(
            "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-colors whitespace-nowrap",
            expanded 
              ? "bg-white/20 border-white/20 text-white" 
              : "bg-white/60 text-gray-600 border-black/5 group-hover:text-primary group-hover:border-primary/30"
          )}>
            <span>{bookCount}</span><span className="hidden sm:inline">&nbsp;{bookCount === 1 ? 'book' : 'books'}</span>
          </div>
        </div>

        {/* Actions / Expand */}
        <div className="col-span-6 sm:col-span-3 flex justify-end items-center min-h-[32px]">
          {action}
          <div className="flex items-center justify-end shrink-0 ml-1">
            <span className={cn("text-[10px] font-medium hidden lg:inline transition-colors", expanded ? "text-white/80" : "text-muted-foreground")}>
              {expanded ? 'Collapse' : 'Expand'}
            </span>
            <ChevronRight className={cn(
              'h-3.5 w-3.5 transition duration-200',
              expanded ? 'rotate-90 text-white' : 'text-muted-foreground/60'
            )} />
          </div>
        </div>
      </div>
      {expanded && (
        <div className="bg-white/50 border-t border-black/5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-3">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
