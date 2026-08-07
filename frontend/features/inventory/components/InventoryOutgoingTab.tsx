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
        headerRight={
          <span className="text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 shadow-sm shadow-amber-950/5 hidden sm:block">
            Important: Print the box label first
          </span>
        }
        onToggle={(id) => {
          const box = actions.outgoingBoxes.find((item: InventoryBox) => item.id === id)
          if (box) void actions.toggleOutgoingBox(box)
        }}
        emptyText="No outgoing boxes yet"
        emptySubtext="Complete a verification session in the Book Verification tab to add boxes here."
        emptyIcon={<Send className="h-5 w-5" />}
        subtitleSuffix="Completed Verification Boxes"
        renderDate={(box) => {
          const verifiedTime = box.latest_inventory_scan_at
          return verifiedTime ? new Date(verifiedTime) : (box.created_at ? new Date(box.created_at) : null)
        }}
        renderCompletedBy={(box) => box.box_sessions?.[0]?.inventory_started_profile?.name || box.box_sessions?.[0]?.inventory_received_profile?.name || null}
        renderAction={(box: InventoryBox, expanded) => {
          const boxLabelPrinted = actions.printedBoxLabels.has(box.id) || !!box.box_sessions?.[0]?.inventory_printed_by
          const allPrinted = boxLabelPrinted
          return (
            <div className="flex flex-col gap-1 w-full sm:w-auto sm:shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 sm:gap-2 justify-end w-full sm:w-auto">
                {!isMobile && (
                  <button
                    onClick={(e) => { e.stopPropagation(); actions.handlePrintLabel(box) }}
                    disabled={actions.loadingPrint === box.id}
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 transition-colors shrink-0',
                      expanded
                        ? 'bg-white text-foreground shadow-sm hover:bg-white/90'
                        : 'bg-white/60 border border-white/80 text-foreground hover:bg-white/80'
                    )}
                  >
                    {actions.loadingPrint === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    {actions.loadingPrint === box.id ? 'Loading...' : 'Print Label'}
                  </button>
                )}
                <label className="flex items-center gap-1.5 cursor-default shrink-0">
                  <input
                    type="checkbox"
                    checked={boxLabelPrinted}
                    readOnly
                    className="h-4 w-4 rounded border-border accent-primary cursor-default shrink-0"
                    title={boxLabelPrinted ? 'Label printed' : 'Label not yet printed'}
                  />
                  {isMobile && <span className={cn("text-xs font-semibold", expanded ? "text-white/90" : "text-muted-foreground")}>Printed</span>}
                </label>
                <button
                  onClick={(e) => { e.stopPropagation(); actions.openConfirm('send_to_cut', box) }}
                  disabled={actions.sendingToCut === box.id || !allPrinted}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0',
                    expanded ? 'bg-white text-primary shadow-sm hover:bg-white/90' : 'premium-gradient-ui-card--solid text-white'
                  )}
                >
                  {actions.sendingToCut === box.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {actions.sendingToCut === box.id ? 'Sending...' : 'Send to Cut'}
                </button>
              </div>
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
