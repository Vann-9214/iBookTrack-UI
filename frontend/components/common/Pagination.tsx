'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
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
  const [jumpValue, setJumpValue] = useState(String(currentPage))

  useEffect(() => {
    setJumpValue(String(currentPage))
  }, [currentPage])

  const commitJump = () => {
    const page = parseInt(jumpValue, 10)
    if (Number.isFinite(page)) {
      onPageChange(Math.max(1, Math.min(page, totalPages || 1)))
    } else {
      setJumpValue(String(currentPage))
    }
  }

  return (
    <div className={cn('relative flex w-full items-center justify-center py-4 px-4 border-t border-border', className)}>
      {options.length > 0 && (
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Items per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
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
          type="button"
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
            Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                type="button"
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
            <>
              {currentPage > 3 && (
                <>
                  <button type="button" onClick={() => onPageChange(1)} className="h-8 w-8 rounded text-xs font-medium hover:bg-muted text-foreground transition-colors">
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
                  type="button"
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
                  <button type="button" onClick={() => onPageChange(totalPages)} className="h-8 w-8 rounded text-xs font-medium hover:bg-muted text-foreground transition-colors">
                    {totalPages}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canNextPage}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {totalPages > 1 && (
          <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
            <span className="text-xs text-muted-foreground">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onBlur={commitJump}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitJump()
                }
              }}
              className="h-8 w-14 rounded border border-border bg-background px-2 text-xs text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Go to page"
            />
          </div>
        )}
      </div>

      {showPageInfo && (
        <span className="absolute right-4 hidden sm:inline text-xs text-muted-foreground font-medium">
          Page {currentPage} of {totalPages}
        </span>
      )}
    </div>
  )
}
