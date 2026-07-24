import { useState, useCallback, useEffect } from 'react'

// Hard cap on how many rows any paginated view may show at once. The default
// page size is also 50. This is enforced here so every list in the app is
// guaranteed to page at 50 max, regardless of what a caller passes in.
export const MAX_PAGE_SIZE = 50

// Clamp any requested size to 1..MAX_PAGE_SIZE.
const clampPageSize = (size: number) =>
  Math.max(1, Math.min(Number.isFinite(size) ? size : MAX_PAGE_SIZE, MAX_PAGE_SIZE))

interface UsePaginationProps {
  totalItems: number
  defaultPageSize?: number
}

export function usePagination({ totalItems, defaultPageSize = MAX_PAGE_SIZE }: UsePaginationProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(clampPageSize(defaultPageSize))

  // Sync pageSize when defaultPageSize changes (still clamped to the max)
  useEffect(() => {
    setPageSize(clampPageSize(defaultPageSize))
  }, [defaultPageSize])

  const totalPages = Math.ceil(totalItems / pageSize)

  // Calculate offset and limit for API calls
  const offset = (currentPage - 1) * pageSize
  const limit = pageSize

  // Handle page changes
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1))
    setCurrentPage(validPage)
  }, [totalPages])

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  // Handle page size changes, reset to page 1 (clamped to the 50 max)
  const setNewPageSize = useCallback((size: number) => {
    setPageSize(clampPageSize(size))
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    pageSize,
    totalPages,
    offset,
    limit,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: setNewPageSize,
    canPrevPage: currentPage > 1,
    canNextPage: currentPage < totalPages,
  }
}
