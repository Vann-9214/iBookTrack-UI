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
  const dynamicTone = TONE.theme
  const [boxSearches, setBoxSearches] = useState<Record<string, string>>({})
  const [selectedNote, setSelectedNote] = useState<{ isbn: string, title: string, remarks: string } | null>(null)

  const handleBoxSearchChange = (lotNumber: string, value: string) => {
    setBoxSearches(prev => ({ ...prev, [lotNumber]: value }))
  }

  return (
    <div className={cn("rounded-2xl border shadow-sm ring-1 flex flex-col mt-5 overflow-hidden shrink-0 bg-white transition-colors duration-300", dynamicTone.card)}>
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm',
            dynamicTone.icon
          )}>
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-foreground leading-none">Non-Processable by Lot & Box</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">
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
      {filteredLots.length > 0 && (
        <div className="grid grid-cols-12 gap-4 px-5 sm:px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
          <div className="col-span-1"></div>
          <div className="col-span-5 sm:col-span-4">Lot Number</div>
          <div className="col-span-3 sm:col-span-4 text-center">Items</div>
          <div className="col-span-3 text-right pr-2">Actions</div>
        </div>
      )}

      <div className={cn("flex-1 min-h-0 overflow-y-auto", filteredLots.length > 4 && "max-h-[28rem]")}>
        <Accordion type="multiple" className="w-full divide-y divide-border/40">
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
            
            <AccordionContent className="bg-muted/10 border-t border-border/40 pb-0 pt-0">
               <div className="px-5 sm:px-6 py-3">
                 <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2 px-1">
                   <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Boxes in {lot.lot_number}</span>
                   <div className="relative shrink-0 hidden sm:block">
                     <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground/60" />
                     <Input 
                       placeholder="Search boxes..." 
                       value={boxSearches[lot.lot_number] || ''} 
                       onChange={e => handleBoxSearchChange(lot.lot_number, e.target.value)}
                       className="w-40 h-7 pl-8 text-[11px] bg-background border-border/60 shadow-sm focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-md"
                     />
                   </div>
                 </div>
                 <Accordion type="multiple" className="w-full space-y-2 pb-3">
                    {Object.values(lot.boxes)
                      .filter(box => !boxSearches[lot.lot_number] || box.box_number.toLowerCase().includes(boxSearches[lot.lot_number].toLowerCase()))
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
        {filteredLots.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            {searchQuery ? (
              <>
                <Search className="h-10 w-10 text-gray-300 mb-3" />
                <span className="font-medium text-gray-600">No results found for "{searchQuery}"</span>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 mb-3 opacity-80">
                  <Check className="h-6 w-6 text-white stroke-[3]" />
                </div>
                <span className="font-medium text-gray-600">No problem lots found</span>
              </>
            )}
          </div>
        )}
        </Accordion>
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
