'use client'

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RefreshControlProps {
  onRefresh: () => Promise<void> | void
  lastUpdated?: Date | null
  refreshing?: boolean
  label?: string
  className?: string
  buttonClassName?: string
  storageKey?: string
}

export function RefreshControl({
  onRefresh,
  lastUpdated,
  refreshing = false,
  label = "Refresh",
  className,
  buttonClassName,
  storageKey,
}: RefreshControlProps) {
  const [persistedTime, setPersistedTime] = useState<string | null>(null)

  useEffect(() => {
    if (lastUpdated) {
      const timeStr = lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
      setPersistedTime(timeStr)
      if (storageKey) {
        localStorage.setItem(`last_refresh_${storageKey}`, timeStr)
      }
    }
  }, [lastUpdated, storageKey])

  useEffect(() => {
    if (storageKey && !persistedTime) {
      const stored = localStorage.getItem(`last_refresh_${storageKey}`)
      if (stored) {
        setPersistedTime(stored)
      } else {
        const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
        setPersistedTime(now)
      }
    } else if (!storageKey && !persistedTime) {
      setPersistedTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }))
    }
  }, [storageKey, persistedTime])

  const timeLabel = persistedTime ? `Updated ${persistedTime}` : 'Updating...'

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className={cn("gap-1.5", buttonClassName)}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        {label}
      </Button>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeLabel}</span>
    </div>
  )
}
