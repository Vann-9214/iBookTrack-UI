'use client'

import { Boxes, Inbox } from 'lucide-react'
import { Pagination } from '@/components/common/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { usePagination } from '@/hooks/usePagination'
import { BoxEntry, BookInBox } from '../types/scan.types'
import { ScanBoxRow } from './ScanBoxRow'

interface IncomingScanBoxListProps {
  boxes: BoxEntry[]
  expandedBoxId: string | null
  boxBooks: Record<string, BookInBox[]>
  loadingBoxBooks: string | null
  receivingBox: string | null
  loading?: boolean
  toggleBox: (boxId: string) => void
  openConfirm: (box: BoxEntry) => void
}

export function IncomingScanBoxList({
  boxes,
  expandedBoxId,
  boxBooks,
  loadingBoxBooks,
  receivingBox,
  loading = false,
  toggleBox,
  openConfirm,
}: IncomingScanBoxListProps) {
  const pagination = usePagination({ totalItems: boxes.length, defaultPageSize: 10 })
  const paginatedBoxes = boxes.slice(pagination.offset, pagination.offset + pagination.limit)

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
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Incoming</p>
              <h2 className="text-lg font-black tracking-tight text-foreground leading-none">Incoming Boxes</h2>
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
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/50" />
            ))}
          </div>
        ) : boxes.length === 0 ? (
          <div className="py-12 text-center bg-white/60 rounded-xl border border-black/5">
            <div className="premium-gradient-ui-card__icon mx-auto mb-4">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="font-semibold text-foreground">No incoming boxes</p>
            <p className="text-sm text-muted-foreground">Boxes sent from Endorsement will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginatedBoxes.map((box) => (
              <ScanBoxRow
                key={box.id}
                box={box}
                expanded={expandedBoxId === box.id}
                onToggle={() => toggleBox(box.id)}
                books={boxBooks[box.id] || []}
                loadingBooks={loadingBoxBooks === box.id}
                receivingBox={receivingBox}
                onOpenConfirm={openConfirm}
              />
            ))}
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
