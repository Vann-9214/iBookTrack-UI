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
    ? 'bg-emerald-600 shadow-emerald-500/25'
    : 'bg-blue-600 shadow-blue-500/25'
  const headerTextTheme = isJaguar ? 'text-emerald-950/80' : 'text-blue-950/80'
  const subTextTheme = isJaguar ? 'text-emerald-600/80' : 'text-blue-600/80'

  return (
    <div className={cn("relative rounded-2xl border shadow-sm ring-1 overflow-hidden flex flex-col mt-5 transition-all duration-300 min-h-[500px]", cardTheme)}>
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
        
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block group">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isJaguar ? "text-emerald-500 group-focus-within:text-emerald-600" : "text-blue-500 group-focus-within:text-blue-600")} />
            <Input 
              placeholder="Search lots or ISBN..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-56 h-9 pl-9 pr-4 text-xs font-medium bg-white/60 border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 rounded-xl placeholder:text-slate-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0",
                isJaguar ? "focus-visible:border-emerald-300 focus-visible:ring-emerald-100/50" : "focus-visible:border-blue-300 focus-visible:ring-blue-100/50"
              )}
            />
          </div>
          <div className={cn(
            'inline-flex items-center rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm ring-1 transition-all',
            isJaguar ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/50' : 'bg-blue-50 text-blue-700 ring-blue-200/50'
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
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center shadow-sm",
              isJaguar ? "bg-emerald-100" : "bg-blue-100"
            )}>
              <Inbox className={cn("h-6 w-6", isJaguar ? "text-emerald-600" : "text-blue-600")} />
            </div>
            <p className="text-[15px] font-bold text-foreground mt-1">No lots & boxes found</p>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {searchQuery ? `No results match "${searchQuery}"` : 'There are no flagged items matching your criteria.'}
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2 px-1 py-1">
            {filteredLots.map((lot) => (
              <AccordionItem key={lot.lot_number} value={lot.lot_number} className="border border-slate-200/60 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <AccordionTrigger className={cn("w-full grid grid-cols-12 gap-4 items-center px-4 sm:px-5 py-3 text-left hover:no-underline group [&>svg]:hidden transition-all duration-300", isJaguar ? "data-[state=open]:bg-emerald-500 data-[state=open]:shadow-lg" : "data-[state=open]:bg-blue-600 data-[state=open]:shadow-lg")}>
                   {/* Icon */}
                   <div className="col-span-1">
                     <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 group-hover:scale-105 shadow-sm ring-1 ring-black/5", isJaguar ? "bg-emerald-50 text-emerald-600 group-data-[state=open]:bg-white/20 group-data-[state=open]:text-white group-data-[state=open]:ring-transparent" : "bg-blue-50 text-blue-600 group-data-[state=open]:bg-white/20 group-data-[state=open]:text-white group-data-[state=open]:ring-transparent")}>
                       <Package className="h-4 w-4" />
                     </div>
                   </div>

                   {/* Lot name */}
                   <div className="col-span-5 sm:col-span-4 min-w-0">
                     <span className="text-[13px] font-black text-slate-800 truncate block tracking-tight group-data-[state=open]:text-white transition-colors">
                       {String(lot.lot_number).toLowerCase().startsWith('lot') ? lot.lot_number : `Lot ${lot.lot_number}`}
                     </span>
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block group-data-[state=open]:text-white/80 transition-colors">
                       Warehouse Entry
                     </span>
                   </div>

                   {/* Box count */}
                   <div className="col-span-3 sm:col-span-4 flex justify-center">
                     <Badge variant="outline" className={cn("border-transparent px-2.5 py-0.5 text-[9px] font-black shadow-sm uppercase tracking-wider ring-1 transition-colors", isJaguar ? "bg-emerald-50 text-emerald-700 ring-emerald-200/50 group-data-[state=open]:bg-white/20 group-data-[state=open]:text-white group-data-[state=open]:ring-transparent" : "bg-blue-50 text-blue-700 ring-blue-200/50 group-data-[state=open]:bg-white/20 group-data-[state=open]:text-white group-data-[state=open]:ring-transparent")}>
                       {lot.totalFlags} items
                     </Badge>
                   </div>

                   {/* Expand chevron */}
                   <div className="col-span-3 flex justify-end items-center gap-2 pr-1">
                     <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline group-data-[state=open]:hidden">Expand</span>
                     <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline group-data-[state=closed]:hidden group-data-[state=open]:text-white/80 transition-colors">Collapse</span>
                     <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors group-data-[state=open]:bg-white/20">
                       <ChevronRight className="h-3.5 w-3.5 text-slate-500 transition-transform duration-300 group-data-[state=open]:rotate-90 group-data-[state=open]:text-white" />
                     </div>
                   </div>
                </AccordionTrigger>
                
                <AccordionContent className={cn("border-t pb-2.5 pt-2.5 px-3 sm:px-4 relative overflow-hidden", isJaguar ? "bg-emerald-50/30 border-emerald-100/50" : "bg-blue-50/30 border-blue-100/50")}>
                   {/* Decorative background element */}
                   <div className={cn("absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/3", isJaguar ? "bg-emerald-300" : "bg-blue-300")} />
                   
                   <div className="flex items-center gap-2 mb-2 px-1">
                     <div className={cn("p-1 rounded-md shadow-sm border", isJaguar ? "bg-emerald-100 border-emerald-200/60 text-emerald-700" : "bg-blue-100 border-blue-200/60 text-blue-700")}>
                       <Boxes className="h-3 w-3" />
                     </div>
                     <span className={cn("text-[9px] font-black uppercase tracking-[0.15em]", isJaguar ? "text-emerald-800/60" : "text-blue-800/60")}>Boxes inside {lot.lot_number}</span>
                   </div>
                   
                   <Accordion type="multiple" className="w-full space-y-1.5 relative z-10">
                      {Object.values(lot.boxes).map((box) => (
                        <AccordionItem key={box.box_number} value={box.box_number} className="border-0 rounded-xl bg-white/70 backdrop-blur-md overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] hover:ring-black/[0.08] transition-all duration-300 group/box">
                          <AccordionTrigger className={cn("px-3 py-2 sm:px-4 hover:no-underline transition-all duration-300 [&>svg]:opacity-40 [&>svg]:transition-transform [&>svg]:duration-300", isJaguar ? "hover:bg-emerald-50/50 data-[state=open]:bg-emerald-50/80" : "hover:bg-blue-50/50 data-[state=open]:bg-blue-50/80")}>
                            <div className="flex justify-between items-center w-full pr-3">
                              <div className="flex items-center gap-2.5">
                                <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg shadow-sm transition-all duration-300 group-data-[state=open]/box:scale-105 group-data-[state=open]/box:shadow-md", isJaguar ? "bg-emerald-100 text-emerald-600 group-data-[state=open]/box:bg-emerald-600 group-data-[state=open]/box:text-white" : "bg-blue-100 text-blue-600 group-data-[state=open]/box:bg-blue-600 group-data-[state=open]/box:text-white")}>
                                  <Inbox className="h-3 w-3" />
                                </div>
                                <div className="flex flex-col items-start leading-tight">
                                  <span className="font-bold tracking-tight text-slate-800 text-[12px]">Box {box.box_number}</span>
                                  <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Contains flagged items</span>
                                </div>
                              </div>
                              <Badge variant="outline" className={cn("px-2 py-0 text-[9px] h-4 font-black uppercase tracking-widest border-transparent shadow-sm flex items-center", isJaguar ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60" : "bg-blue-100 text-blue-700 ring-1 ring-blue-200/60")}>
                                {box.flags.length} {box.flags.length === 1 ? 'flag' : 'flags'}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          
                          <AccordionContent className="px-3 sm:px-4 py-2.5 bg-white/60 border-t border-black/[0.03]">
                            <div className="space-y-1.5">
                               {box.flags.map((f, i) => (
                                 <div key={`${f.scan_id}-${i}`} className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-[0_1px_5px_-2px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 relative overflow-hidden group/flag hover:border-red-200 hover:shadow-[0_2px_8px_-2px_rgba(239,68,68,0.15)] transition-all duration-300">
                                   {/* Subtle status indicator */}
                                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-red-500 opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all duration-300" />
                                   
                                   <div className="pl-2 flex-1 min-w-0">
                                     <div className="flex items-center gap-1.5 mb-1">
                                       <span className="inline-flex items-center justify-center px-1 py-0.5 rounded-[3px] bg-slate-100 border border-slate-200 text-slate-500">
                                         <FileText className="h-2.5 w-2.5" />
                                       </span>
                                       <div className="font-mono font-bold text-slate-700 text-[11px] tracking-wide bg-slate-50 px-1.5 py-0 rounded border border-slate-100">{f.isbn}</div>
                                     </div>
                                     <h4 className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-1">{f.title || 'Unknown Title'}</h4>
                                     
                                     {f.remarks && (
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); setSelectedNote({ isbn: f.isbn, title: f.title || 'Unknown Title', remarks: f.remarks! }) }}
                                         className="mt-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors border border-blue-100 shadow-sm w-fit"
                                       >
                                         <MessageSquare className="h-2.5 w-2.5" />
                                         View Notes
                                       </button>
                                     )}
                                   </div>
                                   
                                   <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 ml-2 sm:ml-3 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-slate-100">
                                     <div className="flex flex-col sm:items-end gap-0.5">
                                       <span className="bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1">
                                         <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                                         {ISSUE_LABELS[f.issue] || f.issue}
                                       </span>
                                       <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                                         by <span className="text-slate-600">{f.flagged_by_name || 'System'}</span>
                                       </span>
                                     </div>
                                     
                                     <button 
                                         onClick={(e) => { e.stopPropagation(); handleResolveClick(f); }} 
                                         disabled={resolvingId === f.scan_id}
                                         className={cn(
                                           "relative overflow-hidden text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg transition-all duration-300 shadow-sm group/btn flex items-center gap-1",
                                           resolvingId === f.scan_id 
                                             ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                             : "bg-emerald-50 text-emerald-600 border border-emerald-200/60 hover:bg-emerald-500 hover:text-white hover:border-transparent hover:shadow-sm hover:shadow-emerald-500/20"
                                         )}
                                       >
                                         {resolvingId === f.scan_id ? (
                                           <div className="h-2.5 w-2.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                                         ) : (
                                           <Check className="h-3 w-3 transition-transform group-hover/btn:scale-110" />
                                         )}
                                         {resolvingId === f.scan_id ? 'Wait' : 'Resolve'}
                                       </button>
                                   </div>
                                 </div>
                               ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                   </Accordion>
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
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg", isJaguar ? "bg-emerald-600" : "bg-blue-600")}>
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
