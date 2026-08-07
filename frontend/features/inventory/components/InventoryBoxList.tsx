'use client'

import { Hash, Package } from 'lucide-react'
import { Pagination } from '@/components/common/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { usePagination } from '@/hooks/usePagination'
import { InventoryBoxRow } from './InventoryBoxRow'
import type { BookInBox, InventoryBox } from '../types/inventory.types'

export function InventoryBoxList({
  boxes,
  expandedBoxId,
  booksByBox,
  loadingBoxId,
  onToggle,
  renderBadge,
  renderAction,
  renderDate,
  renderSender,
  renderCompletedBy,
  renderReceivedBy,
  renderBooks,
  showEmpty = true,
  emptyText = 'No boxes found.',
  emptySubtext,
  emptyIcon,
  lotFallback = '—',
  loading = false,
  defaultPageSize = 10,
  title = 'Boxes',
  eyebrow = 'Inventory',
  subtitleSuffix,
  headerRight,
}: {
  boxes: InventoryBox[]
  expandedBoxId: string | null
  booksByBox: Record<string, BookInBox[]>
  loadingBoxId: string | null
  onToggle: (boxId: string) => void
  renderBadge?: (box: InventoryBox, expanded: boolean) => React.ReactNode
  renderAction?: (box: InventoryBox, expanded: boolean) => React.ReactNode
  renderDate?: (box: InventoryBox) => Date | null
  renderSender?: (box: InventoryBox) => string | null
  renderCompletedBy?: (box: InventoryBox) => string | null
  renderReceivedBy?: (box: InventoryBox) => string | null
  renderBooks: (box: InventoryBox, books: BookInBox[]) => React.ReactNode
  showEmpty?: boolean
  emptyText?: string
  emptySubtext?: string
  emptyIcon?: React.ReactNode
  lotFallback?: string
  loading?: boolean
  defaultPageSize?: number
  title?: string
  eyebrow?: string
  subtitleSuffix?: string
  headerRight?: React.ReactNode
}) {
  const pagination = usePagination({ totalItems: boxes.length, defaultPageSize })
  const paginatedBoxes = boxes.slice(pagination.offset, pagination.offset + pagination.limit)

  if (!boxes.length && !showEmpty && !loading) {
    return null
  }

  return (
    <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl relative flex flex-col transition duration-300">
      <div className="premium-gradient-ui-card__glow" />
      <div className="relative flex flex-col flex-1 min-h-0">
        <div className="m-4 mb-2 p-3 premium-gradient-ui-card__surface rounded-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="premium-gradient-ui-card__icon w-10 h-10 shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{eyebrow}</p>
                <h2 className="text-lg font-black tracking-tight text-foreground leading-none">{title}</h2>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {loading ? (
                    <Skeleton className="h-3 w-4 rounded bg-black/10" />
                  ) : (
                    <span>{boxes.length}</span>
                  )}
                  <span>box{loading || boxes.length !== 1 ? 'es' : ''}{subtitleSuffix && ` · ${subtitleSuffix}`}</span>
                </div>
              </div>
            </div>
            {headerRight && (
              <div className="shrink-0 flex items-center justify-end">
                {headerRight}
              </div>
            )}
          </div>
        </div>

        {/* Table header */}
        {(loading || boxes.length > 0) && (
          <div className="relative grid grid-cols-12 gap-3 px-4 sm:px-5 py-3 text-[10px] font-bold uppercase tracking-wider border-y border-black/5 items-center bg-primary/5 text-primary/70">
            <div className="col-span-1 flex justify-start"><Hash className="h-2.5 w-2.5" /></div>
            <div className="col-span-4 sm:col-span-3">Box Number</div>
            <div className="hidden sm:block sm:col-span-3">Details</div>
            <div className="col-span-3 sm:col-span-2 text-center">Books</div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="divide-y divide-border/40">
              {Array.from({ length: defaultPageSize }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 sm:gap-3 items-center px-3 sm:px-4 py-1.5 sm:py-2">
                  <div className="col-span-1 flex justify-start items-center"><Skeleton className="h-3 w-6 rounded-sm bg-black/5" /></div>
                  <div className="col-span-4 sm:col-span-3 min-w-0"><Skeleton className="h-4 w-20 rounded bg-black/5" /></div>
                  <div className="hidden sm:flex sm:col-span-3 min-w-0 flex-col gap-1"><Skeleton className="h-3.5 w-24 rounded bg-black/5" /><Skeleton className="h-2.5 w-16 rounded bg-black/5" /></div>
                  <div className="col-span-3 sm:col-span-2 flex justify-center"><Skeleton className="h-5 w-14 rounded-full bg-black/5" /></div>
                  <div className="col-span-4 sm:col-span-3 flex justify-end items-center gap-2 pr-6"><Skeleton className="h-5 w-16 rounded-md bg-black/5" /><Skeleton className="h-3.5 w-10 rounded bg-black/5 hidden sm:block" /></div>
                </div>
              ))}
            </div>
          ) : boxes.length === 0 ? (
          <div className="py-12 text-center">
            {emptyIcon && <div className="premium-gradient-ui-card__icon mx-auto mb-4">{emptyIcon}</div>}
            <p className="font-semibold text-foreground">{emptyText}</p>
            {emptySubtext && <p className="text-sm text-muted-foreground">{emptySubtext}</p>}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {paginatedBoxes.map((box, idx) => {
              const expanded = expandedBoxId === box.id
              const books = booksByBox[box.id] || []
              const absoluteIndex = (pagination.currentPage - 1) * pagination.pageSize + idx + 1
              return (
                <InventoryBoxRow
                  key={box.id}
                  box={box}
                  expanded={expanded}
                  onToggle={() => onToggle(box.id)}
                  badge={renderBadge?.(box, expanded)}
                  action={renderAction?.(box, expanded)}
                  date={renderDate?.(box)}
                  sender={renderSender?.(box)}
                  completedBy={renderCompletedBy?.(box)}
                  receivedBy={renderReceivedBy?.(box)}
                  lotFallback={lotFallback}
                  absoluteIndex={absoluteIndex}
                >
                  {expanded && renderBooks(box, books)}
                </InventoryBoxRow>
              )
            })}
          </div>
        )}
        </div>

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
