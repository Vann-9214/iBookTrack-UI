import React from "react"
import { Package, Clock, MapPin, Inbox, AlertTriangle } from "lucide-react"
import { SearchResult, PendingAssignment, StorageLocation } from "../types/locator.types"

interface LocatorSearchResultsProps {
  searchDone: boolean
  lotSearchSummary: { lotNumbers: string[] } | null
  visibleLotSearchBoxCount: number
  searchResults: SearchResult[]
  pendingAssignments: PendingAssignment[]
  searchUnlocated: { box_number: string }[]
  searchValue: string
  locations: StorageLocation[]
  setActiveSection: (section: number) => void
  setDetailSlot: (slot: StorageLocation | null) => void
}

export const LocatorSearchResults: React.FC<LocatorSearchResultsProps> = ({
  searchDone,
  lotSearchSummary,
  visibleLotSearchBoxCount,
  searchResults,
  pendingAssignments,
  searchUnlocated,
  searchValue,
  locations,
  setActiveSection,
  setDetailSlot
}) => {
  if (!searchDone) return null

  return (
    <div className="flex flex-col gap-2">
      {lotSearchSummary ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <Package className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-semibold text-primary">
            Found {visibleLotSearchBoxCount} boxes in {lotSearchSummary.lotNumbers.map(number => number.toLowerCase().startsWith('lot') ? number : `Lot ${number}`).join(', ')}
          </p>
        </div>
      ) : searchResults.length > 0 ? (
        searchResults.map(r => {
          const isPending = r.status === 'pending' || pendingAssignments.some(assignment =>
            assignment.assignment_id === r.assignment_id || assignment.box_id === r.box_id
          )
          return isPending ? (
            <div key={r.assignment_id} className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              <div className="flex-1 text-sm">
                <span className="font-semibold text-foreground">Found in Pending Assignments: {r.box_number}</span>
                {r.lot_number && <span className="ml-2 text-muted-foreground">· {r.lot_number.toLowerCase().startsWith('lot') ? r.lot_number : `Lot ${r.lot_number}`}</span>}
              </div>
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{r.location_label}</span>
            </div>
          ) : (
            <div key={r.assignment_id} className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 text-sm">
                <span className="font-semibold text-foreground">{r.box_number}</span>
                {r.lot_number && <span className="ml-2 text-muted-foreground">· {r.lot_number.toLowerCase().startsWith('lot') ? r.lot_number : `Lot ${r.lot_number}`}</span>}
              </div>
              <span className="text-sm font-semibold text-primary">{r.location_label}</span>
              <button onClick={() => {
                const loc = locations.find(l => l.id === r.location_id)
                if (loc) {
                  const match = loc.rack.match(/^S(\d+)-/)
                  setActiveSection(match ? parseInt(match[1]) : 1)
                  setDetailSlot(loc)
                }
              }} className="text-xs underline text-muted-foreground hover:text-foreground">View slot</button>
            </div>
          )
        })
      ) : searchUnlocated.length > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <Inbox className="h-4 w-4 shrink-0 text-primary" />
          <p className="font-semibold text-foreground text-sm">
            Found in Unassigned Boxes: <span className="font-semibold">{searchUnlocated.map(box => box.box_number).join(', ')}</span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700 dark:text-amber-400">No box found for &ldquo;{searchValue}&rdquo;.</p>
        </div>
      )}
    </div>
  )
}
