'use client'

import { Boxes, Send } from 'lucide-react'
import { Pagination } from '@/components/common/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { usePagination } from '@/hooks/usePagination'
import { BookInBox, BoxEntry } from '../types/cut.types'
import { CutBoxRow } from './CutBoxRow'

interface CutWorkQueueProps {
  boxes: BoxEntry[]
  expandedBoxId: string | null
  onToggleBox: (boxId: string) => void
  onActionClick: (action: 'receive' | 'send', box: BoxEntry) => void
  sendingBoxId: string | null
  boxBooks: Record<string, BookInBox[]>
  loadingBoxBooksId: string | null
  loading?: boolean
}

export function CutWorkQueue({
  boxes,
  expandedBoxId,
  onToggleBox,
  onActionClick,
  sendingBoxId,
  boxBooks,
  loadingBoxBooksId,
  loading = false,
}: CutWorkQueueProps) {
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
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Send</p>
              <h2 className="text-lg font-black tracking-tight text-foreground leading-none">Outgoing Boxes</h2>
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
              <Send className="h-5 w-5" />
            </div>
            <p className="font-semibold text-foreground">No outgoing boxes</p>
            <p className="text-sm text-muted-foreground">Received boxes will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginatedBoxes.map((box) => (
              <CutBoxRow
                key={box.id}
                box={box}
                type="outgoing"
                isExpanded={expandedBoxId === box.id}
                onToggle={() => onToggleBox(box.id)}
                onActionClick={onActionClick}
                isProcessing={sendingBoxId === box.id}
                books={boxBooks[box.id] || []}
                isLoadingBooks={loadingBoxBooksId === box.id}
                receivedBy={box.box_sessions?.[0]?.cut_received_profile?.name || null}
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
