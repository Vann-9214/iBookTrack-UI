import React from 'react'
import { Inbox, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RefreshControl } from '@/components/refresh-control'
import { CutTab } from '../types/cut.types'

interface CutTabsProps {
  activeTab: CutTab
  setActiveTab: (tab: CutTab) => void
  incomingCount: number
  outgoingCount: number
  onRefresh: () => void
  refreshing: boolean
  lastUpdated: Date | null
}

export const CutTabs: React.FC<CutTabsProps> = ({
  activeTab,
  setActiveTab,
  incomingCount,
  outgoingCount,
  onRefresh,
  refreshing,
  lastUpdated,
}) => {
  return (
    <div className="flex items-center gap-1 mb-6 border-b border-border/50 pb-px">
      <button
        onClick={() => setActiveTab('incoming')}
        className={cn(
          'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
          activeTab === 'incoming'
            ? 'border-primary text-primary bg-primary/5'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <Inbox className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Incoming</span>
        <span className={cn(
          'ml-1.5 px-2 py-0.5 rounded-full text-xs',
          activeTab === 'incoming' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        )}>{incomingCount}</span>
      </button>
      <button
        onClick={() => setActiveTab('outgoing')}
        className={cn(
          'flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2.5 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
          activeTab === 'outgoing'
            ? 'border-primary text-primary bg-primary/5'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <Send className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Outgoing</span>
        <span className={cn(
          'ml-1.5 px-2 py-0.5 rounded-full text-xs',
          activeTab === 'outgoing' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        )}>{outgoingCount}</span>
      </button>
      
      <div className="ml-auto">
        <RefreshControl onRefresh={onRefresh} refreshing={refreshing} lastUpdated={lastUpdated} className="hidden sm:flex" />
      </div>
    </div>
  )
}
