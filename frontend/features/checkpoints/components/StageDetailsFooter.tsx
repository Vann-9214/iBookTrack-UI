import { Pagination } from '@/components/pagination'

interface StageDetailsFooterProps {
  totalItems: number
  stageModalPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function StageDetailsFooter({
  totalItems,
  stageModalPage,
  totalPages,
  onPageChange,
}: StageDetailsFooterProps) {
  return (
    <div className="border-t border-border/50 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground rounded-b-xl flex-wrap">
      <div className="w-full grid grid-cols-3 items-center p-4">
        <span className="font-medium shrink-0">
          {totalItems} {totalItems === 1 ? 'entry' : 'entries'} shown
        </span>
        <div className="flex justify-center">
          {totalItems > 0 && (
            <div className="scale-90 origin-center">
              <Pagination
                currentPage={stageModalPage}
                totalPages={totalPages}
                pageSize={50}
                onPageChange={onPageChange}
                canPrevPage={stageModalPage > 1}
                canNextPage={stageModalPage < totalPages}
                showPageInfo={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
