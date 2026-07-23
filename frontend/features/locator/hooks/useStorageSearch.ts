import { useState } from "react"
import { SearchResult, SearchKind, PendingAssignment, ReadyBox } from "../types/locator.types"
import { locatorService } from "../services/locator.service"

export function useStorageSearch(
  brand: string,
  pendingAssignments: PendingAssignment[],
  readyBoxes: ReadyBox[],
  setExpandedPendingLocations: React.Dispatch<React.SetStateAction<Set<string>>>,
  setActiveSection: (shelf: number) => void
) {
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchUnlocated, setSearchUnlocated] = useState<{ box_number: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [searchKind, setSearchKind] = useState<SearchKind>(null)
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('')
  const [searchValidationError, setSearchValidationError] = useState<string | null>(null)
  const [lotSearchSummary, setLotSearchSummary] = useState<{ lotNumbers: string[] } | null>(null)
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set())

  const handleSearch = async () => {
    const rawQuery = searchValue.trim()
    if (!rawQuery) { clearSearch(); return }

    const boxMatch = rawQuery.match(/^box\s*(?:[:#-]\s*)?(.+)$/i)
    const lotMatch = rawQuery.match(/^lot\s*(?:[:#-]\s*)?(.+)$/i)
    const normalizedIsbn = rawQuery.replace(/[\s-]/g, '')
    const isFullIsbn = /^(?:[\dA-Za-z]{10}|[\dA-Za-z]{13})$/.test(normalizedIsbn)
    const kind = boxMatch ? 'box' : lotMatch ? 'lot' : isFullIsbn ? 'isbn' : null
    const query = boxMatch?.[1].trim() || (lotMatch ? `Lot ${lotMatch[1].trim()}` : normalizedIsbn)

    if (!kind || !query) {
      setSearchValidationError('Enter Box before a box number, Lot before a lot number, or a complete 10/13-character ISBN.')
      setSearchDone(false)
      setSearchResults([])
      setSearchUnlocated([])
      setHighlightedCells(new Set())
      setLotSearchSummary(null)
      return
    }

    setSearchKind(kind)
    setAppliedSearchQuery(query.toLowerCase())
    setSearchValidationError(null)
    setSearchLoading(true)
    setSearchDone(false)
    setLotSearchSummary(null)
    try {
      const data = await locatorService.searchStorage(query, brand, kind)
      const normalizedQuery = query.toLowerCase()
      const rawResults: SearchResult[] = data.results || []
      const results = kind === 'lot'
        ? rawResults.filter(result => result.lot_number?.toLowerCase() === normalizedQuery)
        : kind === 'box'
          ? rawResults.filter(result => result.box_number.toLowerCase() === normalizedQuery)
          : rawResults
      const pendingAssignmentIds = new Set(pendingAssignments.map(assignment => assignment.assignment_id))
      const pendingBoxIds = new Set(pendingAssignments.map(assignment => assignment.box_id))
      const confirmedResults = results.filter(result =>
        result.status !== 'pending' &&
        !pendingAssignmentIds.has(result.assignment_id) &&
        !pendingBoxIds.has(result.box_id)
      )
      const matchedBoxIds = new Set(results.map(result => result.box_id))
      const matchingPendingLocations = pendingAssignments
        .filter(assignment =>
          (kind === 'box' && assignment.box_number.toLowerCase() === normalizedQuery) ||
          (kind === 'lot' && assignment.lot_number?.toLowerCase() === normalizedQuery) ||
          matchedBoxIds.has(assignment.box_id)
        )
        .map(assignment => assignment.location_id)

      setSearchResults(results)
      setSearchUnlocated(data.unlocated || [])
      setLotSearchSummary(data.lot_summary ? {
        lotNumbers: data.lot_summary.lot_numbers || [],
      } : null)
      setHighlightedCells(new Set(confirmedResults.map(result => `${result.rack}-${result.level}`)))
      setExpandedPendingLocations(new Set(matchingPendingLocations))
      if (confirmedResults.length > 0) {
        const firstRack = confirmedResults[0].rack
        const match = firstRack.match(/^S(\d+)-/)
        setActiveSection(match ? parseInt(match[1]) : 1)
      }
    } finally {
      setSearchLoading(false)
      setSearchDone(true)
    }
  }

  const clearSearch = () => {
    setSearchValue("")
    setHighlightedCells(new Set())
    setSearchResults([])
    setSearchUnlocated([])
    setSearchKind(null)
    setAppliedSearchQuery('')
    setSearchValidationError(null)
    setLotSearchSummary(null)
    setExpandedPendingLocations(new Set())
    setSearchDone(false)
  }

  const activeSearchQuery = searchDone ? appliedSearchQuery : ''

  const filteredReadyBoxes = activeSearchQuery
    ? readyBoxes.filter(box =>
        searchKind === 'box' ? box.box_number.toLowerCase() === activeSearchQuery :
        searchKind === 'lot' ? box.lot_number?.toLowerCase() === activeSearchQuery :
        box.books.some(book => book.isbn.replace(/[\s-]/g, '').toLowerCase() === activeSearchQuery)
      )
    : readyBoxes

  const matchedSearchBoxIds = new Set(searchResults.map(result => result.box_id))

  const filteredPendingAssignments = activeSearchQuery
    ? pendingAssignments.filter(assignment =>
        searchKind === 'box' ? assignment.box_number.toLowerCase() === activeSearchQuery :
        searchKind === 'lot' ? assignment.lot_number?.toLowerCase() === activeSearchQuery :
        matchedSearchBoxIds.has(assignment.box_id)
      )
    : pendingAssignments

  const visibleLotSearchBoxCount = new Set([
    ...filteredReadyBoxes.map(box => box.id),
    ...filteredPendingAssignments.map(assignment => assignment.box_id),
    ...searchResults.map(result => result.box_id),
  ]).size

  return {
    searchValue,
    setSearchValue,
    searchResults,
    searchUnlocated,
    searchLoading,
    searchDone,
    searchKind,
    appliedSearchQuery,
    searchValidationError,
    setSearchValidationError,
    lotSearchSummary,
    highlightedCells,
    handleSearch,
    clearSearch,
    activeSearchQuery,
    filteredReadyBoxes,
    filteredPendingAssignments,
    visibleLotSearchBoxCount
  }
}
