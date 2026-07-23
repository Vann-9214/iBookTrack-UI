import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/pagination'

interface StageDetailsFooterProps {
  totalItems: number
  stageModalPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onClose: () => void
}

export function StageDetailsFooter({
  totalItems,
  stageModalPage,
  totalPages,
  onPageChange,
  onClose,
}: StageDetailsFooterProps) {
  return (
    <div className="border-t border-border/50 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground rounded-b-xl flex-wrap">
      <div className="w-full flex items-center justify-between p-4">
        <span className="font-medium shrink-0">
          {totalItems} {totalItems === 1 ? 'entry' : 'entries'} shown
        </span>
        {totalItems > 0 && (
          <div className="scale-90 origin-right">
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
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="rounded-lg shadow-sm border-border/50 hover:bg-muted/50 font-medium ml-4"
        >
          Close
        </Button>
      </div>
    </div>
  )
}
