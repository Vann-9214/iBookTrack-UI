import { Loader2, Printer, Send } from 'lucide-react'
import { useIsMobile } from '@/components/ui/use-mobile'
import { InventoryBoxList } from './InventoryBoxList'
import { InventoryOutgoingBookList } from './InventoryOutgoingBookList'
import type { InventoryBox } from '../types/inventory.types'
import type { useInventory } from '../hooks/useInventory'
import type { useInventoryActions } from '../hooks/useInventoryActions'

export function InventoryOutgoingTab({ inventory, actions }: { inventory: ReturnType<typeof useInventory>; actions: ReturnType<typeof useInventoryActions> }) {
  const isMobile = useIsMobile()

  if (inventory.loadingBoxes) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading boxes...</p>
      </div>
    )
  }

  if (actions.outgoingBoxes.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-white border border-dashed border-border rounded-xl">
        <Send className="h-10 w-10 mb-3 text-primary" />
        <p className="font-semibold text-foreground">No outgoing boxes yet</p>
        <p className="text-sm">Complete a verification session in the Book Verification tab to add boxes here.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <InventoryBoxList
        boxes={actions.outgoingBoxes}
        expandedBoxId={actions.outgoingExpandedBoxId}
        booksByBox={inventory.boxBooks}
        loadingBoxId={actions.outgoingLoadingBooks}
        onToggle={(id) => {
          const box = actions.outgoingBoxes.find((item: InventoryBox) => item.id === id)
          if (box) void actions.toggleOutgoingBox(box)
        }}
        renderBadge={() => (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Verified</span>
        )}
        renderDate={(box) => {
          const verifiedTime = box.latest_inventory_scan_at
          return verifiedTime ? new Date(verifiedTime) : (box.created_at ? new Date(box.created_at) : null)
        }}
        renderAction={(box: InventoryBox) => {
          const boxLabelPrinted = actions.printedBoxLabels.has(box.id)
          const allPrinted = boxLabelPrinted
          return (
            <div className="flex flex-col gap-1 sm:shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); actions.handlePrintLabel(box) }}
                  disabled={actions.loadingPrint === box.id}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
                >
                  {actions.loadingPrint === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  {actions.loadingPrint === box.id ? 'Loading...' : 'Print Label'}
                </button>
                <input
                  type="checkbox"
                  checked={boxLabelPrinted}
                  readOnly
                  className="h-4 w-4 rounded border-border accent-primary cursor-default shrink-0"
                  title={boxLabelPrinted ? 'Label printed' : 'Label not yet printed'}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); actions.openConfirm('send_to_cut', box) }}
                  disabled={actions.sendingToCut === box.id || !allPrinted}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {actions.sendingToCut === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {actions.sendingToCut === box.id ? 'Sending...' : 'Send to Cut'}
                </button>
              </div>
              {!allPrinted && (
                <p className="text-[10px] text-amber-600 font-medium text-right">Print the box label first</p>
              )}
            </div>
          )
        }}
        renderBooks={(box, books) => (
          <InventoryOutgoingBookList box={box} books={books} loading={actions.outgoingLoadingBooks === box.id} isMobile={isMobile} actions={actions} />
        )}
      />
    </div>
  )
}
