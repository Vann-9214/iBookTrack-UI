import { useState } from 'react'
import { Inbox, Loader2 } from 'lucide-react'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { InventoryBookList } from './InventoryBookList'
import { InventoryBoxList } from './InventoryBoxList'
import type { InventoryBox } from '../types/inventory.types'
import type { useInventory } from '../hooks/useInventory'
import type { useInventoryActions } from '../hooks/useInventoryActions'

export function InventoryIncomingTab({ inventory, actions }: { inventory: ReturnType<typeof useInventory>; actions: ReturnType<typeof useInventoryActions> }) {
  const [pageSize, setPageSize] = useState(50)
  const pagination = usePagination({ totalItems: actions.incomingBoxes.length, defaultPageSize: pageSize })
  const paginatedBoxes = actions.incomingBoxes.slice(pagination.offset, pagination.offset + pagination.limit)

  if (inventory.loadingBoxes) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading boxes...</p>
      </div>
    )
  }
  if (actions.incomingBoxes.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
        <Inbox className="h-10 w-10 mb-3 text-primary" />
        <p className="font-semibold text-foreground">No incoming boxes</p>
        <p className="text-sm">Boxes sent by the warehouse will appear here.</p>
      </div>
    )
  }
  return (
    <div className="flex-1 flex flex-col">
      <InventoryBoxList
        boxes={paginatedBoxes}
        expandedBoxId={inventory.expandedBox}
        booksByBox={inventory.boxBooks}
        loadingBoxId={inventory.loadingBooks}
        onToggle={(id) => inventory.toggleBox(id)}
        renderBadge={() => (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Sent from Warehouse</span>
        )}
        renderAction={(box: InventoryBox) => (
          <button
            onClick={(e) => { e.stopPropagation(); actions.openConfirm('receive', box) }}
            disabled={actions.receivingBox === box.id}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
          >
            {actions.receivingBox === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
            {actions.receivingBox === box.id ? 'Receiving...' : 'Receive Box'}
          </button>
        )}
        renderDate={(box: InventoryBox) => {
          const warehouseTime = box.box_sessions?.[0]?.warehouse_time_received
          return warehouseTime ? new Date(warehouseTime) : (box.created_at ? new Date(box.created_at) : null)
        }}
        renderBooks={(box, books) => <InventoryBookList books={books} box={box} loading={inventory.loadingBooks === box.id} />}
      />
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          onPageChange={pagination.goToPage}
          onPageSizeChange={(size) => { setPageSize(size); pagination.setPageSize(size) }}
          canPrevPage={pagination.canPrevPage}
          canNextPage={pagination.canNextPage}
          pageSizeOptions={[25, 50, 100]}
          className="mt-3 bg-card border rounded-xl"
        />
      )}
    </div>
  )
}
