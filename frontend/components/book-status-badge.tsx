import { cn } from '@/lib/utils'

export interface BookStatusBadgeProps {
  scan_status: string
  flag?: { issue: string; remarks?: string } | null
  showFlag?: boolean
  className?: string
}

export function BookStatusBadge({ scan_status, flag, showFlag = true, className }: BookStatusBadgeProps) {
  const isProcessable = scan_status === 'processable'
  const issue = flag?.issue
  const isMismatch = issue === 'mismatched-book'
  const isGenericStatus = !issue || issue === 'non-processable' || issue === 'non_processable'

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className={cn(
        'text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap w-fit',
        isProcessable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      )}>
        {isProcessable ? 'Processable' : 'Non-Processable'}
      </span>
      {showFlag && issue && !isGenericStatus && (
        <span className={cn(
          'text-[9px] font-semibold leading-none capitalize',
          isMismatch ? 'text-amber-600' : 'text-red-500/80'
        )}>
          {isMismatch ? 'Mismatched' : issue}
        </span>
      )}
    </div>
  )
}
