import { Search, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function InventorySearchBar({
  searchQuery,
  onQueryChange,
  loading = false,
}: {
  searchQuery: string
  onQueryChange: (value: string) => void
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 flex-1 max-w-md rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          inputMode="text"
          placeholder="Search by box or lot number..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-white/60 rounded-lg bg-white/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
