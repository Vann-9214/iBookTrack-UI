import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileText, Search, Package, Inbox, Check, ChevronRight, Boxes, MessageSquare, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { LotGroup, QCFlag } from '../types'
import { getTone, ISSUE_LABELS } from '../utils/constants'

interface NonProcessableListProps {
  filteredLots: LotGroup[]
  totalCount: number
  searchQuery: string
  setSearchQuery: (q: string) => void
  loading: boolean
  resolvingId: number | null
  handleResolveClick: (flag: QCFlag) => void
  isJaguar: boolean
}

export function NonProcessableList({
  filteredLots,
  totalCount,
  searchQuery,
  setSearchQuery,
  loading,
  resolvingId,
  handleResolveClick,
  isJaguar
}: NonProcessableListProps) {
  const TONE = getTone(isJaguar)
  const [selectedNote, setSelectedNote] = useState<{ isbn: string, title: string, remarks: string } | null>(null)

  const cardTheme = isJaguar
    ? 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/20 border-emerald-200/50 ring-emerald-100/50'
    : 'bg-gradient-to-br from-blue-50/50 to-indigo-100/20 border-blue-200/50 ring-blue-100/50'
  const iconTheme = isJaguar
    ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25'
    : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25'
  const headerTextTheme = isJaguar ? 'text-emerald-950/80' : 'text-blue-950/80'
  const subTextTheme = isJaguar ? 'text-emerald-600/80' : 'text-blue-600/80'

  return (
    <div className={cn("relative rounded-2xl border shadow-sm ring-1 overflow-hidden flex flex-col mt-5 transition-all duration-300 min-h-[400px]", cardTheme)}>
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/20 blur-2xl" />
      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-black/5 shrink-0 bg-white/40 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg',
            iconTheme
          )}>
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <h2 className={cn("text-[15px] font-black tracking-tight leading-none", headerTextTheme)}>Non-Processable by Lot & Box</h2>
            <p className={cn("text-[11.5px] font-medium mt-0.5", subTextTheme)}>
              Items flagged during receiving and QC
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="relative hidden sm:block mr-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input 
              placeholder="Search lots or ISBN..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 h-9 pl-9 text-xs bg-muted/40 border-transparent shadow-none focus-visible:bg-background focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-lg"
            />
          </div>
          <div className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold transition-colors bg-background',
            isJaguar ? 'border-green-200 text-green-700' : 'border-blue-200 text-blue-700'
          )}>
            {totalCount} flags
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className={cn("relative grid grid-cols-12 gap-3 px-4 sm:px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b border-black/5 items-center", isJaguar ? "bg-emerald-50/50 text-emerald-800/70" : "bg-blue-50/50 text-blue-800/70")}>
        <div className="col-span-1 flex justify-start"><span className="hidden">#</span></div>
        <div className="col-span-5 sm:col-span-4">Lot Number</div>
        <div className="col-span-3 sm:col-span-4 text-center">Items</div>
        <div className="col-span-3 text-right pr-1">Actions</div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white/40">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center h-full">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-muted-foreground/60 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Loading lots...</p>
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 px-6 text-center h-full">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-sm">
              <Inbox className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-[15px] font-bold text-foreground mt-1">No lots & boxes found</p>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {searchQuery ? `No results match "${searchQuery}"` : 'There are no flagged items matching your criteria.'}
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className={cn("w-full divide-y divide-border/40 bg-white/60", filteredLots.length > 4 && "max-h-[28rem]")}>
        {filteredLots.map((lot) => (
          <AccordionItem key={lot.lot_number} value={lot.lot_number} className="border-none bg-transparent">
            <AccordionTrigger className="w-full grid grid-cols-12 gap-4 items-center px-5 sm:px-6 py-3 text-left transition-all duration-150 group hover:bg-muted/40 hover:no-underline data-[state=open]:bg-primary/[0.03] [&>svg]:hidden">
               {/* Icon */}
               <div className="col-span-1">
                 <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-muted group-data-[state=open]:bg-blue-100 group-data-[state=open]:text-blue-600 transition-colors">
                   <Package className="h-4 w-4" />
                 </div>
               </div>

               {/* Lot name */}
               <div className="col-span-5 sm:col-span-4 min-w-0">
                 <span className="text-sm font-bold text-foreground truncate block">
                   {String(lot.lot_number).toLowerCase().startsWith('lot') ? lot.lot_number : `Lot ${lot.lot_number}`}
                 </span>
               </div>

               {/* Box count */}
               <div className="col-span-3 sm:col-span-4 flex justify-center">
                 <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground text-[11px] font-bold">
                   {lot.totalFlags} items
                 </Badge>
               </div>

               {/* Expand chevron */}
               <div className="col-span-3 flex justify-end items-center gap-2 pr-1">
                 <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline group-data-[state=open]:hidden">Expand</span>
                 <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline group-data-[state=closed]:hidden">Collapse</span>
                 <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-90" />
               </div>
            </AccordionTrigger>
            
            <AccordionContent className="bg-white/40 border-t border-border/40 pb-0 pt-0">
               <div className="px-5 sm:px-6 py-3">
                 <div className="border-b border-border/40 pb-2 mb-2 px-1">
                   <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Boxes in {lot.lot_number}</span>
                 </div>
                 <Accordion type="multiple" className="w-full space-y-2 pb-3">
                    {Object.values(lot.boxes)
                      .map((box) => (
                    <AccordionItem key={box.box_number} value={box.box_number} className="border rounded-xl bg-white overflow-hidden shadow-sm">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-center w-full pr-4">
                          <div className="flex items-center gap-2">
                            <Inbox className="h-4 w-4 text-gray-400" />
                            <span>Box {box.box_number}</span>
                          </div>
                          <span className="text-gray-600 font-medium text-xs bg-gray-100 px-2 py-0.5 rounded-full ring-1 ring-gray-200">
                            {box.flags.length} flags
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 py-3 bg-gray-50 border-t">
                        <div className="space-y-2">
                           {box.flags.map((f, i) => (
                             <div key={`${f.scan_id}-${i}`} className="bg-white p-3 rounded-lg border text-sm flex justify-between items-center shadow-sm hover:border-red-200 transition-colors">
                               <div>
                                 <div className="font-mono font-semibold text-gray-800">{f.isbn}</div>
                                 <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{f.title || 'Unknown Title'}</div>
                                 {f.remarks && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); setSelectedNote({ isbn: f.isbn, title: f.title || 'Unknown Title', remarks: f.remarks! }) }}
                                     className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 px-2.5 py-1 rounded-md transition-colors border border-blue-100"
                                   >
                                     <MessageSquare className="h-3.5 w-3.5" />
                                     View Notes
                                   </button>
                                 )}
                               </div>
                               <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4">
                                 <span className="bg-red-50 text-red-700 ring-1 ring-red-200/60 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                   {ISSUE_LABELS[f.issue] || f.issue}
                                 </span>
                                 <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-medium text-gray-400">by {f.flagged_by_name || 'System'}</span>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleResolveClick(f); }} 
                                     disabled={resolvingId === f.scan_id}
                                     className="text-[10px] text-emerald-600 font-bold hover:underline disabled:opacity-50"
                                   >
                                     {resolvingId === f.scan_id ? 'Resolving...' : 'Resolve'}
                                   </button>
                                 </div>
                               </div>
                             </div>
                           ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
               </Accordion>
               </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        </Accordion>
        )}
      </div>

      {/* Notes Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-overlay-in" onClick={() => setSelectedNote(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-in ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
            <div className={cn("px-6 py-5 flex items-center justify-between", isJaguar ? "bg-emerald-50 border-b border-emerald-100" : "bg-blue-50 border-b border-blue-100")}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg", isJaguar ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-blue-500 to-indigo-600")}>
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-gray-800">Flag Notes</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    <span className="font-mono font-semibold text-gray-800">{selectedNote.isbn}</span> • {selectedNote.title}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNote(null)}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto leading-relaxed shadow-inner custom-scrollbar">
                {selectedNote.remarks}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
