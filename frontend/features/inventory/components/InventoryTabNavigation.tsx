import { ClipboardCheck, Inbox, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RefreshControl } from '@/components/refresh-control'
import type { InventoryTab } from '../types/inventory.types'

export function InventoryTabNavigation({
  tab,
  onTabChange,
  counts,
  refreshing,
  onRefresh,
  lastUpdated,
  disabled,
  accentColor,
}: {
  tab: InventoryTab
  onTabChange: (tab: InventoryTab) => void
  counts: Record<InventoryTab, number>
  refreshing: boolean
  onRefresh: () => void
  lastUpdated: Date | null
  disabled?: boolean
  accentColor?: string
}) {
  return (
    <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-px">
      <button
        disabled={disabled}
        onClick={() => onTabChange('incoming')}
        className={cn(
          'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
          tab === 'incoming'
            ? 'border-primary text-primary bg-primary/5'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Inbox className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Incoming</span>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs',
          tab === 'incoming' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {counts.incoming}
        </span>
      </button>

      <button
        disabled={disabled}
        onClick={() => onTabChange('verification')}
        className={cn(
          'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
          tab === 'verification'
            ? 'bg-primary/10'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        style={tab === 'verification' ? { borderBottomColor: accentColor, color: accentColor, backgroundColor: `${accentColor}14` } : undefined}
      >
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Book Verification</span>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs',
            tab === 'verification' ? '' : 'bg-muted text-muted-foreground'
          )}
          style={tab === 'verification' ? { backgroundColor: `${accentColor}1A`, color: accentColor } : undefined}
        >
          {counts.verification}
        </span>
      </button>

      <button
        disabled={disabled}
        onClick={() => onTabChange('outgoing')}
        className={cn(
          'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
          tab === 'outgoing'
            ? 'border-primary text-primary bg-primary/5'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Send className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Outgoing</span>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs',
          tab === 'outgoing' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {counts.outgoing}
        </span>
      </button>

      <div className="ml-auto">
        <RefreshControl onRefresh={onRefresh} refreshing={refreshing} lastUpdated={lastUpdated} storageKey="inventory" className="hidden sm:flex" />
      </div>
    </div>
  )
}
