import { authFetch } from '@/lib/auth-api'

export type NotificationType = 'success' | 'warning' | 'error' | 'info'

export interface LiveNotification {
  id: string
  source: 'transmission' | 'unaccounted' | 'scan' | 'pipeline'
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface LiveNotificationsResponse {
  success: boolean
  notifications: LiveNotification[]
  unreadCount: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export async function fetchLiveNotifications(limit = 20): Promise<LiveNotificationsResponse> {
  const response = await authFetch(`${API_URL}/api/dashboard/notifications?limit=${limit}`)
  const data = await response.json() as LiveNotificationsResponse | { error?: string }

  if (!response.ok) {
    throw new Error('error' in data && data.error ? data.error : 'Failed to load notifications')
  }

  return data as LiveNotificationsResponse
}