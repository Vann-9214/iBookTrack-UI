import { cn } from '@/lib/utils'
import { FileText, Search, Package, Inbox, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
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

  return (
    <div className={cn("rounded-xl border border-gray-200 border-t-2 bg-white mt-5 flex flex-col overflow-hidden shadow-sm shrink-0", isJaguar ? 'border-t-green-500' : 'border-t-blue-600')}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-50/80 border-b border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm", dynamicTone.icon)}>
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-0.5 text-[15px]">
              Non-Processable by Lot & Box — All Time
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className={cn("h-1.5 w-1.5 rounded-full", dynamicTone.modalDot)}></span>
              {totalCount} flags total
            </div>
          </div>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search ISBN, box, lot or title..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 h-9 bg-white border-gray-200 text-sm rounded-lg shadow-sm focus-visible:ring-blue-500"
          />
        </div>
      </div>

      <div className={cn("p-5", filteredLots.length > 4 && "max-h-[28rem] overflow-y-auto")}>
        <Accordion type="multiple" className="w-full space-y-3">
        {filteredLots.map((lot) => (
          <AccordionItem key={lot.lot_number} value={lot.lot_number} className={cn("border rounded-2xl bg-white overflow-hidden shadow-sm transition-all data-[state=open]:shadow-md", dynamicTone.card)}>
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-black/5 transition-colors">
               <div className="flex justify-between items-center w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm", dynamicTone.icon)}>
                      <Package className="h-5 w-5" />
                    </div>
                    <span className="font-black text-lg text-gray-800">{lot.lot_number}</span>
                  </div>
                  <span className="text-red-700 font-bold bg-red-100 ring-1 ring-red-200 px-3 py-1 rounded-full text-sm">
                    {lot.totalFlags} items
                  </span>
               </div>
            </AccordionTrigger>
            <AccordionContent className="bg-white/50 px-5 pb-5 pt-2 border-t border-black/5">
               <Accordion type="multiple" className="w-full space-y-2 mt-2">
                  {Object.values(lot.boxes).map((box) => (
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
                               </div>
                               <div className="flex flex-col items-end gap-1.5 shrink-0">
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
    </div>
  )
}
