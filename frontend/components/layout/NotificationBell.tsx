'use client'

import { Bell } from 'lucide-react'
import { useBrand } from '@/hooks/use-brand'

export interface NotificationBellProps {
  count?: number
  onClick?: () => void
}

export function NotificationBell({ count = 0, onClick }: NotificationBellProps) {
  const { colors } = useBrand()

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
      aria-label="Notifications"
      style={{
        color: colors.accent,
        borderColor: `${colors.accent}25`,
        background: `${colors.accent}08`,
      }}
    >
      <Bell className="w-4 h-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}
