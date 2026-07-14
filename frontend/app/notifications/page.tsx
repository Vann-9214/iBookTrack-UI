"use client"

import { useMemo, useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Trash2,
  Filter,
  Bell
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLiveNotifications, type NotificationType } from "@/hooks/use-live-notifications"
import { DashboardNavbar } from "@/components/top-bar"
import { useBrand } from "@/hooks/use-brand"

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
}

const typeConfig = {
  success: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success',
    badge: 'bg-success/20 text-success',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning',
    badge: 'bg-warning/20 text-warning',
    icon: AlertTriangle,
  },
  error: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    text: 'text-destructive',
    badge: 'bg-destructive/20 text-destructive',
    icon: XCircle,
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-500',
    badge: 'bg-blue-500/20 text-blue-500',
    icon: AlertCircle,
  },
}

export default function NotificationsPage() {
  const { brand } = useBrand()
  const { notifications: liveNotifications, loading, error, markAsRead, markAllAsRead, unreadCount } = useLiveNotifications(24, 5000)
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([])
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')

  const visibleNotifications = useMemo(() => {
    return liveNotifications.filter((notification) => !dismissedNotificationIds.includes(notification.id))
  }, [liveNotifications, dismissedNotificationIds])

  const filteredNotifications = useMemo(() => {
    return filterType === 'all'
      ? visibleNotifications
      : visibleNotifications.filter((notification) => notification.type === filterType)
  }, [filterType, visibleNotifications])

  const displayUnreadCount = unreadCount

  const deleteNotification = (id: string) => {
    markAsRead(id)
    setDismissedNotificationIds((current) => (current.includes(id) ? current : [...current, id]))
  }

  const typeCounts = useMemo(() => ({
    success: visibleNotifications.filter((notification) => notification.type === 'success').length,
    warning: visibleNotifications.filter((notification) => notification.type === 'warning').length,
    error: visibleNotifications.filter((notification) => notification.type === 'error').length,
    info: visibleNotifications.filter((notification) => notification.type === 'info').length,
  }), [visibleNotifications])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
            {/* Page Header */}
            <header className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl text-white shadow-lg shadow-black/5 ring-1 ring-black/5", brand === 'jaguar' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-indigo-400 to-blue-600')}>
                    <Bell className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                      Notifications
                    </h1>
                    <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      {loading
                        ? 'Loading live notifications...'
                        : error
                          ? `Unable to refresh live notifications: ${error}`
                          : displayUnreadCount > 0
                            ? `You have ${displayUnreadCount} unread notification${displayUnreadCount !== 1 ? 's' : ''} for`
                        : 'All notifications read for'} <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-white", brand === 'jaguar' ? 'bg-green-500' : 'bg-blue-500')}>{brand}</span>
                    </p>
                  </div>
                </div>
              </div>
              {displayUnreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  Mark all as read
                </Button>
              )}
            </header>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                All ({visibleNotifications.length})
              </Button>
              <Button
                variant={filterType === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('success')}
                className="gap-2"
              >
                Success ({typeCounts.success})
              </Button>
              <Button
                variant={filterType === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('warning')}
                className="gap-2"
              >
                Warning ({typeCounts.warning})
              </Button>
              <Button
                variant={filterType === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('error')}
                className="gap-2"
              >
                Error ({typeCounts.error})
              </Button>
              <Button
                variant={filterType === 'info' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('info')}
                className="gap-2"
              >
                Info ({typeCounts.info})
              </Button>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <Card className="border-border bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground text-center">
                      {loading ? 'Loading live notifications...' : 'No notifications found'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => {
                  const config = typeConfig[notification.type]
                  const Icon = config.icon
                  return (
                    <Card
                      key={notification.id}
                      className={cn(
                        'border transition-all cursor-pointer',
                        config.border,
                        !notification.read ? config.bg : 'bg-card',
                        !notification.read && 'ring-1 ring-primary/20'
                      )}
                    >
                      <CardContent className="flex gap-4 py-4">
                        {/* Icon */}
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-1',
                          config.bg,
                          config.text
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-foreground">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {notification.timestamp}
                            </Badge>
                            <Badge variant="outline" className={cn('text-[10px] font-normal', config.badge)}>
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                              className="h-8 w-8 p-0"
                            >
                              ✓
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            title="Delete notification"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
