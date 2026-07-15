import { useState, useCallback, useEffect } from 'react'

interface UsePaginationProps {
  totalItems: number
  defaultPageSize?: number
}

export function usePagination({ totalItems, defaultPageSize = 50 }: UsePaginationProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // Sync pageSize when defaultPageSize changes
  useEffect(() => {
    setPageSize(defaultPageSize)
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

  // Handle page size changes, reset to page 1
  const setNewPageSize = useCallback((size: number) => {
    setPageSize(size)
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
