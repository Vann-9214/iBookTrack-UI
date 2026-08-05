import { Inbox, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CutTab } from '../types/cut.types'

interface CutTabsProps {
  activeTab: CutTab
  setActiveTab: (tab: CutTab) => void
  incomingCount: number
  outgoingCount: number
}

export function CutTabs({ activeTab, setActiveTab, incomingCount, outgoingCount }: CutTabsProps) {
  const tabs = [
    { id: 'incoming' as CutTab, label: 'Incoming', icon: Inbox },
    { id: 'outgoing' as CutTab, label: 'Outgoing', icon: Send },
  ]

  const counts: Record<CutTab, number> = {
    incoming: incomingCount,
    outgoing: outgoingCount,
  }

  return (
    <div className="flex items-center gap-1 flex-1">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2.5 text-sm font-semibold rounded-xl transition',
              active
                ? 'premium-gradient-ui-card--solid text-white shadow-md'
                : 'text-muted-foreground hover:bg-black/5'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-bold tabular-nums',
              active ? 'bg-white/20 text-white' : 'bg-black/5 text-muted-foreground'
            )}>
              {counts[id]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
