'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchLiveNotifications, type LiveNotification } from '@/lib/live-notifications'

type UseLiveNotificationsResult = {
  notifications: LiveNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useLiveNotifications(limit = 20, refreshMs = 5000): UseLiveNotificationsResult {
  const [notifications, setNotifications] = useState<LiveNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLiveNotifications(limit)
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setError(null)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchLiveNotifications(limit)
        if (cancelled) return
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
        setError(null)
      } catch (fetchError) {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load notifications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    const interval = window.setInterval(load, refreshMs)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [limit, refreshMs])

  return { notifications, unreadCount, loading, error, refresh }
}