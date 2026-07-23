import { Book, CheckCircle2, Clock, Package, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import type { SearchResult } from '../utils/dashboard.helpers'

type DashboardSearchProps = {
  open: boolean
  type: 'isbn' | 'lot'
  value: string
  rangeStart: string
  rangeEnd: string
  isRange: boolean
  result: SearchResult | null
  loading: boolean
  onOpenChange: (open: boolean) => void
  onTypeChange: (type: 'isbn' | 'lot') => void
  onValueChange: (value: string) => void
  onRangeStartChange: (value: string) => void
  onRangeEndChange: (value: string) => void
  onRangeChange: (value: boolean) => void
  onSearch: () => void
  onClear: () => void
}

export function DashboardSearch(props: DashboardSearchProps) {
  const { open, type, value, rangeStart, rangeEnd, isRange, result, loading, onOpenChange, onTypeChange, onValueChange, onRangeStartChange, onRangeEndChange, onRangeChange, onSearch, onClear } = props
  const data = result?.data ?? {}

  return (
    <>
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-overlay-in" onClick={() => onOpenChange(false)}>
        <div className="bg-card border border-border rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden animate-modal-in" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary shadow-sm"><Search className="h-5 w-5" /></div><div><h3 className="text-lg font-bold tracking-tight text-foreground">Search Dashboard</h3><p className="text-xs text-muted-foreground">Search by ISBN or view all books in a lot</p></div></div>
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4 p-5 overflow-y-auto">
            <div className="flex gap-2"><Button variant={type === 'isbn' ? 'default' : 'outline'} size="sm" onClick={() => onTypeChange('isbn')} className="flex-1">ISBN</Button><Button variant={type === 'lot' ? 'default' : 'outline'} size="sm" onClick={() => onTypeChange('lot')} className="flex-1">Lot</Button></div>
            {type === 'lot' && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isRange} onChange={(event) => onRangeChange(event.target.checked)} className="h-4 w-4" />Search by Range</label>}
            {isRange && type === 'lot' ? <div className="space-y-3"><Input placeholder="From Lot, e.g., 35" value={rangeStart} onChange={(event) => onRangeStartChange(event.target.value)} /><Input placeholder="To Lot, e.g., 36" value={rangeEnd} onChange={(event) => onRangeEndChange(event.target.value)} /></div> : <div><Input placeholder={type === 'isbn' ? 'ISBN number' : 'Lot number, e.g., 64'} value={value} onChange={(event) => onValueChange(type === 'isbn' ? event.target.value.replace(/[^0-9a-zA-Z]/g, '') : event.target.value)} />{type === 'isbn' && value.length > 0 && <p className="text-xs mt-1 text-muted-foreground">{value.length} character{value.length !== 1 ? 's' : ''}</p>}</div>}
            <div className="flex gap-2">{result && <Button variant="outline" onClick={() => { onClear(); onOpenChange(false) }} className="flex-1">Clear</Button>}<Button onClick={onSearch} className={result ? 'flex-1' : 'w-full'} disabled={loading}>{loading ? 'Searching...' : 'Apply Search'}</Button></div>
          </div>
        </div>
      </div>}
      {result && <Card className="border-border bg-card"><CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary">{result.type === 'isbn' ? <Book className="h-4 w-4" /> : <Package className="h-4 w-4" />}</span>{result.type === 'isbn' ? 'ISBN Search Result' : 'Lot Search Results'}</CardTitle><button onClick={onClear} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div></CardHeader><CardContent>
        {loading ? <div className="space-y-2 text-sm text-muted-foreground">Loading search result…</div> : result.type === 'isbn' ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><SearchField label="ISBN" value={data.isbn} full /><SearchField label="Title" value={data.title || 'Unknown Title'} full /><SearchField label="Box Number" value={data.box_number || 'Not assigned'} /><SearchField label="Lot Number" value={data.lot_number || 'Unknown'} /><SearchField label="Current Stage" value={data.current_stage || 'Unknown'} /><SearchField label="Scan Count" value={`${data.scan_count || 0} times`} /></div> : <div className="space-y-4"><div className="flex items-center gap-2">{data.processing_status === 'Completed' && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" />Completed</span>}{data.processing_status === 'In Progress' && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200"><Clock className="h-3.5 w-3.5" />In Progress</span>}</div><SearchField label="Lot Number" value={data.lot_number || data.lot || 'Selected lot'} /><div><div className="flex justify-between text-sm mb-2"><span className="text-muted-foreground">Progress</span><span className="font-semibold">{data.completion_percentage || data.progress || 0}%</span></div><Progress value={data.completion_percentage || data.progress || 0} /></div><div className="grid grid-cols-2 gap-4"><SearchField label="Total Books" value={data.total_books || 0} /><SearchField label="Total Boxes" value={data.total_boxes || 0} /></div></div>}
      </CardContent></Card>}
    </>
  )
}

function SearchField({ label, value, full = false }: { label: string; value: string | number; full?: boolean }) {
  return <div className={full ? 'col-span-full' : ''}><p className="text-sm text-muted-foreground">{label}</p><p className="font-semibold text-base">{value}</p></div>
}
