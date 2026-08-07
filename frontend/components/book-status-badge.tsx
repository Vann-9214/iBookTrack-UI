import { cn } from '@/lib/utils'

export interface BookStatusBadgeProps {
  scan_status: string
  flag?: { issue: string; remarks?: string } | null
  showFlag?: boolean
  className?: string
}

export function BookStatusBadge({ scan_status, flag, showFlag = true, className }: BookStatusBadgeProps) {
  const isProcessable = scan_status === 'processable'
  const rawIssue = flag?.issue
  const isResolved = rawIssue?.startsWith('(Resolved)')
  const issue = isResolved ? rawIssue.replace('(Resolved) ', '') : rawIssue
  const isMismatch = issue === 'mismatched-book'
  const isGenericStatus = !issue || issue === 'non-processable' || issue === 'non_processable'

  return (
    <div className={cn('flex flex-row items-center gap-2', className)}>
      <span className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap w-fit ring-1 shadow-sm',
        isProcessable 
          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ring-emerald-500/30' 
          : 'bg-gradient-to-br from-red-400 to-rose-600 text-white ring-red-500/30'
      )}>
        {isProcessable ? 'Processable' : 'Non-Processable'}
      </span>
      {showFlag && isResolved && (
        <span className="text-[9px] font-bold tracking-wide uppercase text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-sm ring-1 ring-gray-200">
          Resolved
        </span>
      )}
      {showFlag && issue && !isResolved && !isGenericStatus && (
        <span className={cn(
          'text-[9px] font-bold tracking-wide uppercase',
          isMismatch ? 'text-amber-500' : 'text-red-400'
        )}>
          {isMismatch ? 'Mismatched' : issue.replace(/-/g, ' ')}
        </span>
      )}
    </div>
  )
}
