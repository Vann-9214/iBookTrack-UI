import { ClipboardCheck, Inbox, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type EndorsementTab = 'incoming' | 'inspection' | 'outgoing'

interface EndorsementTabsProps {
  activeTab: EndorsementTab
  setActiveTab: (tab: EndorsementTab) => void
  inspSessionActive: boolean
  incomingCount: number
  inspectionCount: number
  outgoingCount: number
}

export function EndorsementTabs({
  activeTab,
  setActiveTab,
  inspSessionActive,
  incomingCount,
  inspectionCount,
  outgoingCount,
}: EndorsementTabsProps) {
  const tabs = [
    { id: 'incoming' as EndorsementTab, label: 'Incoming', icon: Inbox },
    { id: 'inspection' as EndorsementTab, label: 'Endorsement', icon: ClipboardCheck },
    { id: 'outgoing' as EndorsementTab, label: 'Outgoing', icon: Send },
  ]

  const counts: Record<EndorsementTab, number> = {
    incoming: incomingCount,
    inspection: inspectionCount,
    outgoing: outgoingCount,
  }

  return (
    <div className="flex items-center gap-1 flex-1">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            disabled={inspSessionActive}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2.5 text-sm font-semibold rounded-xl transition',
              active
                ? 'premium-gradient-ui-card--solid text-white shadow-md'
                : 'text-muted-foreground hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed'
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
