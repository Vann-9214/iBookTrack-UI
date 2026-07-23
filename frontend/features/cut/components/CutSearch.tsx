import React from 'react'
import { Search, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchType } from '../types/cut.types'

interface CutSearchProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchType: SearchType
  setSearchType: (type: SearchType) => void
}

export const CutSearch: React.FC<CutSearchProps> = ({
  searchQuery,
  setSearchQuery,
  searchType,
  setSearchType,
}) => {
  return (
    <div className="flex items-center gap-2 mb-6">
      <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
        <SelectTrigger className="w-[130px] shrink-0 hover:text-primary-foreground hover:bg-primary transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="box">Box No.</SelectItem>
          <SelectItem value="lot">Lot</SelectItem>
          <SelectItem value="isbn">ISBN</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => {
            let val = e.target.value
            if (searchType === 'isbn') {
              val = val.replace(/[^0-9a-zA-Z]/g, '').slice(0, 13)
            }
            setSearchQuery(val)
          }}
          inputMode="text"
          maxLength={searchType === 'isbn' ? 13 : undefined}
          placeholder={
            searchType === 'isbn'
              ? 'ISBN (10 or 13 characters)'
              : searchType === 'lot'
                ? 'Search by lot number…'
                : 'Search by box number…'
          }
          className="w-full pl-9 pr-9 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
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
