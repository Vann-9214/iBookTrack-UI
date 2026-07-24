import { Book, CheckCircle2, Clock, Package, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const {
    open,
    type,
    value,
    rangeStart,
    rangeEnd,
    isRange,
    result,
    loading,
    onOpenChange,
    onTypeChange,
    onValueChange,
    onRangeStartChange,
    onRangeEndChange,
    onRangeChange,
    onSearch,
    onClear,
  } = props

  const data = result?.data ?? {}

  const handleClose = () => {
    onOpenChange(false)
    if (result) onClear()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-overlay-in"
      onClick={handleClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary shadow-sm">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                {result ? (result.type === 'isbn' ? 'ISBN Search Result' : 'Lot Search Result') : 'Search Dashboard'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {result ? 'Result details' : 'Search by ISBN or view all books in a lot'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-5 p-6 overflow-y-auto">
          {/* Controls: Search Inputs */}
          {!result && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={type === 'isbn' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onTypeChange('isbn')}
                  className="flex-1 font-semibold"
                >
                  ISBN
                </Button>
                <Button
                  variant={type === 'lot' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onTypeChange('lot')}
                  className="flex-1 font-semibold"
                >
                  Lot
                </Button>
              </div>

              {type === 'lot' && (
                <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRange}
                    onChange={(event) => onRangeChange(event.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Search by Range
                </label>
              )}

              {isRange && type === 'lot' ? (
                <div className="space-y-3">
                  <Input
                    placeholder="From Lot, e.g., 35"
                    value={rangeStart}
                    onChange={(event) => onRangeStartChange(event.target.value)}
                  />
                  <Input
                    placeholder="To Lot, e.g., 36"
                    value={rangeEnd}
                    onChange={(event) => onRangeEndChange(event.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <Input
                    placeholder={type === 'isbn' ? 'Enter ISBN number...' : 'Enter Lot number, e.g., 64'}
                    value={value}
                    onChange={(event) =>
                      onValueChange(type === 'isbn' ? event.target.value.replace(/[^0-9a-zA-Z]/g, '') : event.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSearch()
                    }}
                  />
                  {type === 'isbn' && value.length > 0 && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      {value.length} character{value.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              <Button onClick={onSearch} className="w-full font-semibold" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          )}

          {/* Result Display inside Modal */}
          {result && (
            <div className="space-y-5">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading search result...</div>
              ) : result.type === 'isbn' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                  <SearchField label="ISBN" value={data.isbn} full />
                  <SearchField label="Title" value={data.title || 'Unknown Title'} full />
                  <SearchField label="Box Number" value={data.box_number || 'Not assigned'} />
                  <SearchField label="Lot Number" value={data.lot_number || 'Unknown'} />
                  <SearchField label="Current Stage" value={data.current_stage || 'Unknown'} />
                  <SearchField label="Scan Count" value={`${data.scan_count || 0} times`} />
                </div>
              ) : (
                <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <SearchField label="Lot Number" value={data.lot_number || data.lot || 'Selected lot'} />
                    {data.processing_status === 'Completed' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed
                      </span>
                    )}
                    {data.processing_status === 'In Progress' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                        <Clock className="h-3.5 w-3.5" />
                        In Progress
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{data.completion_percentage || data.progress || 0}%</span>
                    </div>
                    <Progress value={data.completion_percentage || data.progress || 0} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SearchField label="Total Books" value={data.total_books || 0} />
                    <SearchField label="Total Boxes" value={data.total_boxes || 0} />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onClear()
                  }}
                  className="flex-1"
                >
                  New Search
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SearchField({ label, value, full = false }: { label: string; value: string | number; full?: boolean }) {
  return (
    <div className={full ? 'col-span-full' : ''}>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="font-semibold text-sm capitalize text-foreground">{value}</p>
    </div>
  )
}
