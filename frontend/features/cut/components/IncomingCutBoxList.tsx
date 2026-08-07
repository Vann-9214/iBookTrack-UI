'use client'

import { Hash, Inbox, Package } from 'lucide-react'
import { Pagination } from '@/components/common/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { usePagination } from '@/hooks/usePagination'
import { BookInBox, BoxEntry } from '../types/cut.types'
import { CutBoxRow } from './CutBoxRow'

interface IncomingCutBoxListProps {
  boxes: BoxEntry[]
  expandedBoxId: string | null
  onToggleBox: (boxId: string) => void
  onActionClick: (action: 'receive' | 'send', box: BoxEntry) => void
  receivingBoxId: string | null
  boxBooks: Record<string, BookInBox[]>
  loadingBoxBooksId: string | null
  loading?: boolean
}

export function IncomingCutBoxList({
  boxes,
  expandedBoxId,
  onToggleBox,
  onActionClick,
  receivingBoxId,
  boxBooks,
  loadingBoxBooksId,
  loading = false,
}: IncomingCutBoxListProps) {
  const pagination = usePagination({ totalItems: boxes.length, defaultPageSize: 10 })
  const paginatedBoxes = boxes.slice(pagination.offset, pagination.offset + pagination.limit)

  return (
    <div className="premium-gradient-ui-card premium-gradient-ui-card--static border-2 rounded-2xl relative flex flex-col transition duration-300">
      <div className="premium-gradient-ui-card__glow" />
      <div className="relative flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="m-4 mb-2 p-3 premium-gradient-ui-card__surface rounded-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="premium-gradient-ui-card__icon w-10 h-10 shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Receive</p>
                <h2 className="text-lg font-black tracking-tight text-foreground leading-none">Incoming Boxes</h2>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {loading ? (
                    <Skeleton className="h-3 w-4 rounded bg-black/10" />
                  ) : (
                    <span>{boxes.length}</span>
                  )}
                  <span>box{loading || boxes.length !== 1 ? 'es' : ''} &middot; Sent from Inventory</span>
                </div>
              </div>
            </div>
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
              {Array.from({ length: 10 }).map((_, i) => (
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
              <div className="premium-gradient-ui-card__icon mx-auto mb-4">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="font-semibold text-foreground">No incoming boxes</p>
              <p className="text-sm text-muted-foreground">Boxes sent from Inventory will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {paginatedBoxes.map((box, idx) => {
                const absoluteIndex = (pagination.currentPage - 1) * pagination.pageSize + idx + 1
                return (
                  <CutBoxRow
                    key={box.id}
                    box={box}
                    type="incoming"
                    isExpanded={expandedBoxId === box.id}
                    onToggle={() => onToggleBox(box.id)}
                    onActionClick={onActionClick}
                    isProcessing={receivingBoxId === box.id}
                    books={boxBooks[box.id] || []}
                    isLoadingBooks={loadingBoxBooksId === box.id}
                    sender={box.box_sessions?.[0]?.inventory_send_profile?.name}
                    absoluteIndex={absoluteIndex}
                  />
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
