'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  canPrevPage: boolean
  canNextPage: boolean
  className?: string
  pageSizeOptions?: number[]
  showPageInfo?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  canPrevPage,
  canNextPage,
  className,
  pageSizeOptions = [],
  showPageInfo = true
}: PaginationProps) {
  const options = pageSizeOptions
  const hasSideContent = options.length > 0 || showPageInfo
  const justifyClass = hasSideContent ? 'justify-center sm:justify-between' : 'justify-center'

  return (
    <div className={cn('flex items-center py-4 px-4 border-t border-border', justifyClass, className)}>
      {options.length > 0 && (
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Items per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {options.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!canPrevPage}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {totalPages <= 7 ? (
            // Show all pages if 7 or fewer
            Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  'h-8 w-8 rounded text-xs font-medium transition-colors',
                  page === currentPage
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                {page}
              </button>
            ))
          ) : (
            // Show abbreviated pagination if more than 7 pages
            <>
              {currentPage > 3 && (
                <>
                  <button onClick={() => onPageChange(1)} className="h-8 w-8 rounded text-xs font-medium hover:bg-muted text-foreground transition-colors">
                    1
                  </button>
                  {currentPage > 4 && <span className="px-1 text-muted-foreground">...</span>}
                </>
              )}

              {[...new Set(
                Array.from(
                  { length: Math.min(5, totalPages) },
                  (_, i) => Math.min(Math.max(1, currentPage - 2 + i), totalPages)
                )
              )].map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={cn(
                    'h-8 w-8 rounded text-xs font-medium transition-colors',
                    page === currentPage
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  {page}
                </button>
              ))}

              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-1 text-muted-foreground">...</span>}
                  <button onClick={() => onPageChange(totalPages)} className="h-8 w-8 rounded text-xs font-medium hover:bg-muted text-foreground transition-colors">
                    {totalPages}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={!canNextPage}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {showPageInfo && (
        <span className="hidden sm:inline text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
      )}
    </div>
  )
}
