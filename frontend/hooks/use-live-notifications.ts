'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchLiveNotifications, type LiveNotification } from '@/lib/live-notifications'

const LS_KEY = 'ibooktrack_read_notifications'

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
  } catch {}
}

export type { LiveNotification }
export type NotificationType = LiveNotification['type']

type UseLiveNotificationsResult = {
  notifications: LiveNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  markAsRead: (id: string) => void
  markAllAsRead: () => void
}

export function useLiveNotifications(limit = 20, refreshMs = 5000): UseLiveNotificationsResult {
  const [notifications, setNotifications] = useState<LiveNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyReadIds = useCallback((notifs: LiveNotification[], ids: Set<string>) => {
    return notifs.map(n => ({ ...n, read: ids.has(n.id) ? true : n.read }))
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLiveNotifications(limit)
      const ids = getReadIds()
      setReadIds(ids)
      setNotifications(applyReadIds(data.notifications, ids))
      setError(null)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [limit, applyReadIds])

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
      return next
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(ns => {
      const ids = getReadIds()
      ns.forEach(n => ids.add(n.id))
      saveReadIds(ids)
      setReadIds(ids)
      return ns.map(n => ({ ...n, read: true }))
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchLiveNotifications(limit)
        if (cancelled) return
        const ids = getReadIds()
        setReadIds(ids)
        setNotifications(applyReadIds(data.notifications, ids))
        setError(null)
      } catch (fetchError) {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load notifications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [limit, refreshMs, applyReadIds])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, loading, error, refresh, markAsRead, markAllAsRead }
}