import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { InventoryBoxList } from './InventoryBoxList'
import { InventoryOutgoingBookList } from './InventoryOutgoingBookList'
import type { InventoryBox } from '../types/inventory.types'
import type { useInventory } from '../hooks/useInventory'
import type { useInventoryActions } from '../hooks/useInventoryActions'
import { Loader2, Printer, Send } from 'lucide-react'

export function InventoryOutgoingTab({ inventory, actions }: { inventory: ReturnType<typeof useInventory>; actions: ReturnType<typeof useInventoryActions> }) {
  const isMobile = useIsMobile()

  return (
    <div className="flex-1 flex flex-col">
      <InventoryBoxList
        title="Outgoing Boxes"
        eyebrow="Send"
        boxes={actions.outgoingBoxes}
        expandedBoxId={actions.outgoingExpandedBoxId}
        booksByBox={inventory.boxBooks}
        loadingBoxId={actions.outgoingLoadingBooks}
        loading={inventory.loadingBoxes}
        onToggle={(id) => {
          const box = actions.outgoingBoxes.find((item: InventoryBox) => item.id === id)
          if (box) void actions.toggleOutgoingBox(box)
        }}
        emptyText="No outgoing boxes yet"
        emptySubtext="Complete a verification session in the Book Verification tab to add boxes here."
        emptyIcon={<Send className="h-5 w-5" />}
        renderBadge={(_, expanded) => (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            expanded ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
          )}>
            Verified
          </span>
        )}
        renderDate={(box) => {
          const verifiedTime = box.latest_inventory_scan_at
          return verifiedTime ? new Date(verifiedTime) : (box.created_at ? new Date(box.created_at) : null)
        }}
        renderCompletedBy={(box) => box.box_sessions?.[0]?.inventory_received_profile?.name || null}
        renderAction={(box: InventoryBox, expanded) => {
          const boxLabelPrinted = actions.printedBoxLabels.has(box.id) || !!box.box_sessions?.[0]?.inventory_printed_by
          const allPrinted = boxLabelPrinted
          return (
            <div className="flex flex-col gap-1 sm:shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); actions.handlePrintLabel(box) }}
                  disabled={actions.loadingPrint === box.id}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors',
                    expanded
                      ? 'bg-white text-foreground shadow-sm hover:bg-white/90'
                      : 'bg-white/60 border border-white/80 text-foreground hover:bg-white/80'
                  )}
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
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                    expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
                  )}
                >
                  {actions.sendingToCut === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {actions.sendingToCut === box.id ? 'Sending...' : 'Send to Cut'}
                </button>
              </div>
              {!allPrinted && (
                <p className={cn('text-[10px] font-medium text-right', expanded ? 'text-white/80' : 'text-amber-600')}>Print the box label first</p>
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
