import { Inbox, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InventoryBookList } from './InventoryBookList'
import { InventoryBoxList } from './InventoryBoxList'
import type { InventoryBox } from '../types/inventory.types'
import type { useInventory } from '../hooks/useInventory'
import type { useInventoryActions } from '../hooks/useInventoryActions'

export function InventoryIncomingTab({ inventory, actions }: { inventory: ReturnType<typeof useInventory>; actions: ReturnType<typeof useInventoryActions> }) {
  return (
    <div className="flex-1 flex flex-col">
      <InventoryBoxList
        title="Incoming Boxes"
        eyebrow="Receive"
        boxes={actions.incomingBoxes}
        expandedBoxId={inventory.expandedBox}
        booksByBox={inventory.boxBooks}
        loadingBoxId={inventory.loadingBooks}
        loading={inventory.loadingBoxes}
        onToggle={(id) => inventory.toggleBox(id)}
        emptyText="No incoming boxes"
        emptySubtext="Boxes sent by the warehouse will appear here."
        emptyIcon={<Inbox className="h-5 w-5" />}
        renderBadge={(_, expanded) => (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            expanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
          )}>
            Sent from Warehouse
          </span>
        )}
        renderAction={(box: InventoryBox, expanded) => (
          <button
            onClick={(e) => { e.stopPropagation(); actions.openConfirm('receive', box) }}
            disabled={actions.receivingBox === box.id}
            className={cn(
              'w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors shrink-0',
              expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
            )}
          >
            {actions.receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
            {actions.receivingBox === box.id ? 'Receiving...' : 'Receive Box'}
          </button>
        )}
        renderDate={(box: InventoryBox) => {
          const session = box.box_sessions?.[0]
          return session?.updated_at ? new Date(session.updated_at) : (session?.warehouse_time_received ? new Date(session.warehouse_time_received) : (box.created_at ? new Date(box.created_at) : null))
        }}
        renderSender={(box: InventoryBox) => box.box_sessions?.[0]?.warehouse_received_profile?.name || null}
        renderBooks={(box, books) => <InventoryBookList books={books} box={box} loading={inventory.loadingBooks === box.id} />}
      />
    </div>
  )
}
