import React from "react"
import { Search, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface LocatorSearchProps {
  searchValue: string
  setSearchValue: (val: string) => void
  setSearchValidationError: (err: string | null) => void
  handleSearch: () => Promise<void>
  searchLoading: boolean
  highlightedCellsCount: number
  searchDone: boolean
  clearSearch: () => void
  searchValidationError: string | null
}

export const LocatorSearch: React.FC<LocatorSearchProps> = ({
  searchValue,
  setSearchValue,
  setSearchValidationError,
  handleSearch,
  searchLoading,
  highlightedCellsCount,
  searchDone,
  clearSearch,
  searchValidationError
}) => {
  return (
    <div className="hidden 2xl:flex flex-col gap-1.5 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-2 justify-center w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ISBN, Box #, or Lot #…"
            value={searchValue}
            onChange={e => { setSearchValue(e.target.value); setSearchValidationError(null) }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="pl-10 h-10 bg-background/70 border-border/60 rounded-full shadow-sm focus-visible:ring-4 focus-visible:ring-primary/15"
          />
        </div>
        <Button onClick={handleSearch} disabled={searchLoading} className="premium-gradient-ui-card--solid h-10 px-5 rounded-full shadow-md transition hover:-translate-y-0.5 hover:shadow-lg shrink-0">
          {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
        {(highlightedCellsCount > 0 || searchDone) && (
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted" onClick={clearSearch}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {searchValidationError && (
        <p className="text-center text-xs text-destructive">{searchValidationError}</p>
      )}
    </div>
  )
}
