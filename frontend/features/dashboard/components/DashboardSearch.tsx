import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SearchResult } from '../utils/dashboard.helpers'

type DashboardSearchProps = {
  open: boolean
  value: string
  result: SearchResult | null
  loading: boolean
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  onSearch: () => void
  onClear: () => void
}

export function DashboardSearch(props: DashboardSearchProps) {
  const {
    open,
    value,
    result,
    loading,
    onOpenChange,
    onValueChange,
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
      role="button"
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-overlay-in"
      onClick={handleClose}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
    >
      <div
        role="presentation"
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
                {result ? 'ISBN Search Result' : 'Search Dashboard'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {result ? 'Result details' : 'Search by ISBN'}
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
              <div>
                <Input
                  placeholder="Enter ISBN number..."
                  value={value}
                  onChange={(event) =>
                    onValueChange(event.target.value.replace(/[^0-9a-zA-Z]/g, ''))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSearch()
                  }}
                />
                {value.length > 0 && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    {value.length} character{value.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                  <SearchField label="ISBN" value={data.isbn} full />
                  <SearchField label="Title" value={data.title || 'Unknown Title'} full />
                  <SearchField label="Box Number" value={data.box_number || 'Not assigned'} />
                  <SearchField label="Lot Number" value={data.lot_number || 'Unknown'} />
                  <SearchField label="Current Stage" value={data.current_stage || 'Unknown'} />
                  <SearchField label="Scan Count" value={`${data.scan_count || 0} times`} />
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
