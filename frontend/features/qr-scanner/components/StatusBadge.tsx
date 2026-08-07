import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { REJECTION_LABELS } from '../utils/qr-scanner.helpers'

export interface StatusBadgeProps {
  status: string
  rejectionReason?: string
  isResolved?: boolean
}

export function StatusBadge({ status, rejectionReason, isResolved }: StatusBadgeProps) {
  const isPass = status === 'P'
  const reasonLabel = rejectionReason
    ? (REJECTION_LABELS[rejectionReason] ?? rejectionReason)
    : null
  
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] font-normal border whitespace-nowrap',
          isPass
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : 'bg-red-50 text-red-700 border-red-300',
        )}
      >
        {isPass ? 'Processable' : 'Non-Processable'}
      </Badge>
      {isResolved && (
        <span className="text-[9px] font-bold tracking-wide uppercase text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-sm ring-1 ring-gray-200">
          Resolved
        </span>
      )}
      {!isPass && reasonLabel && !isResolved && (
        <span className="text-[9px] text-red-500 text-center leading-tight max-w-[100px] break-words">
          {reasonLabel}
        </span>
      )}
    </div>
  )
}
