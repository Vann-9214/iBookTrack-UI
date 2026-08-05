'use client'

import { Boxes } from 'lucide-react'
import { Pagination } from '@/components/common/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { usePagination } from '@/hooks/usePagination'
import { EndorsementBoxRow } from './EndorsementBoxRow'
import type { BoxEntry, BoxBookEntry } from '../types/endorsement.types'

export function EndorsementBoxList({
  boxes,
  expandedBoxId,
  booksByBox,
  loadingBoxId,
  onToggle,
  renderBadge,
  renderAction,
  renderDate,
  renderSender,
  renderReceivedBy,
  renderReceivedByLabel,
  renderCompletedBy,
  renderBooks,
  showEmpty = true,
  emptyText = 'No boxes found.',
  emptySubtext,
  emptyIcon,
  lotFallback = '—',
  loading = false,
  defaultPageSize = 10,
  title = 'Boxes',
  eyebrow = 'Endorsement',
}: {
  boxes: BoxEntry[]
  expandedBoxId: string | null
  booksByBox: Record<string, BoxBookEntry[]>
  loadingBoxId: string | null
  onToggle: (boxId: string) => void
  renderBadge?: (box: BoxEntry, expanded: boolean) => React.ReactNode
  renderAction?: (box: BoxEntry, expanded: boolean) => React.ReactNode
  renderDate?: (box: BoxEntry) => Date | null
  renderSender?: (box: BoxEntry) => string | null
  renderReceivedBy?: (box: BoxEntry) => string | null
  renderReceivedByLabel?: (box: BoxEntry) => string | null
  renderCompletedBy?: (box: BoxEntry) => string | null
  renderBooks: (box: BoxEntry, books: BoxBookEntry[]) => React.ReactNode
  showEmpty?: boolean
  emptyText?: string
  emptySubtext?: string
  emptyIcon?: React.ReactNode
  lotFallback?: string
  loading?: boolean
  defaultPageSize?: number
  title?: string
  eyebrow?: string
}) {
  const pagination = usePagination({ totalItems: boxes.length, defaultPageSize })
  const paginatedBoxes = boxes.slice(pagination.offset, pagination.offset + pagination.limit)

  if (!boxes.length && !showEmpty && !loading) {
    return null
  }

  return (
    <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl p-4 sm:p-5">
      <div className="premium-gradient-ui-card__glow" />
      <div className="relative flex flex-col">
        <div className="mb-4 p-3 premium-gradient-ui-card__surface">
          <div className="flex items-start gap-3">
            <div className="premium-gradient-ui-card__icon w-10 h-10">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{eyebrow}</p>
              <h2 className="text-lg font-black tracking-tight text-foreground leading-none">{title}</h2>
              {!loading && (
                <p className="text-xs text-muted-foreground mt-1">
                  {boxes.length} box{boxes.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: defaultPageSize }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/50" />
            ))}
          </div>
        ) : boxes.length === 0 ? (
          <div className="py-12 text-center">
            {emptyIcon && <div className="premium-gradient-ui-card__icon mx-auto mb-4">{emptyIcon}</div>}
            <p className="font-semibold text-foreground">{emptyText}</p>
            {emptySubtext && <p className="text-sm text-muted-foreground">{emptySubtext}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginatedBoxes.map((box) => {
              const expanded = expandedBoxId === box.id
              const books = booksByBox[box.id] || []
              return (
                <EndorsementBoxRow
                  key={box.id}
                  box={box}
                  expanded={expanded}
                  onToggle={() => onToggle(box.id)}
                  badge={renderBadge?.(box, expanded)}
                  action={renderAction?.(box, expanded)}
                  date={renderDate?.(box)}
                  sender={renderSender?.(box)}
                  receivedBy={renderReceivedBy?.(box)}
                  receivedByLabel={renderReceivedByLabel?.(box) ?? undefined}
                  completedBy={renderCompletedBy?.(box)}
                  lotFallback={lotFallback}
                >
                  {expanded && renderBooks(box, books)}
                </EndorsementBoxRow>
              )
            })}
          </div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.setPageSize}
            canPrevPage={pagination.canPrevPage}
            canNextPage={pagination.canNextPage}
            className="mt-3"
          />
        )}
      </div>
    </div>
  )
}
