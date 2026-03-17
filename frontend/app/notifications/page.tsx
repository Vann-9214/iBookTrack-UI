"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Trash2,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NotificationType = 'success' | 'warning' | 'error' | 'info'

interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  icon: React.ReactNode
}

const allNotifications: Notification[] = [
  {
    id: 1,
    type: 'success',
    title: 'Box Transmitted Successfully',
    message: 'LOT-2024-0891 | BOX-001 (150 books) has been successfully transmitted to the central system.',
    timestamp: '2 minutes ago',
    read: false,
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    id: 2,
    type: 'warning',
    title: 'Incomplete Transmission',
    message: 'LOT-2024-0889 | BOX-003: Only 120 out of 180 books have been transmitted. Please check for discrepancies.',
    timestamp: '15 minutes ago',
    read: false,
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    id: 3,
    type: 'error',
    title: 'Unaccounted Books Detected',
    message: 'ISBN 978-0-13-468602-8 is missing at the Intake station. Reported by Paolo Garcia on Mar 16, 2026.',
    timestamp: '28 minutes ago',
    read: true,
    icon: <XCircle className="h-5 w-5" />,
  },
  {
    id: 4,
    type: 'info',
    title: 'Station Status Update',
    message: 'Scan Station is now processing LOT-2024-0890. Estimated completion time: 30 minutes.',
    timestamp: '45 minutes ago',
    read: true,
    icon: <AlertCircle className="h-5 w-5" />,
  },
  {
    id: 5,
    type: 'warning',
    title: 'Bottleneck Detected',
    message: 'Validation station has 5+ boxes in queue. Consider increasing staff or resources at this station.',
    timestamp: '1 hour ago',
    read: true,
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    id: 6,
    type: 'success',
    title: 'Lot Received Successfully',
    message: 'LOT-2024-0892 has been received at the Warehouse with 200 boxes. All items accounted for.',
    timestamp: '2 hours ago',
    read: true,
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    id: 7,
    type: 'error',
    title: 'Missing Items Report',
    message: 'ISBN 978-0-13-468603-5 missing at QA Review station. Reported by Lisa Tan on Mar 16, 2026.',
    timestamp: '3 hours ago',
    read: true,
    icon: <XCircle className="h-5 w-5" />,
  },
  {
    id: 8,
    type: 'info',
    title: 'Daily Report Generated',
    message: 'Your daily operational report has been generated and is ready for download.',
    timestamp: '4 hours ago',
    read: true,
    icon: <AlertCircle className="h-5 w-5" />,
  },
]

const typeConfig = {
  success: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success',
    badge: 'bg-success/20 text-success',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning',
    badge: 'bg-warning/20 text-warning',
  },
  error: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    text: 'text-destructive',
    badge: 'bg-destructive/20 text-destructive',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-500',
    badge: 'bg-blue-500/20 text-blue-500',
  },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(allNotifications)
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')

  const filteredNotifications = filterType === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filterType)

  const unreadCount = notifications.filter(n => !n.read).length

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Page Header */}
            <header>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` 
                  : 'All notifications read'}
              </p>
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
                All ({notifications.length})
              </Button>
              <Button
                variant={filterType === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('success')}
                className="gap-2"
              >
                Success ({notifications.filter(n => n.type === 'success').length})
              </Button>
              <Button
                variant={filterType === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('warning')}
                className="gap-2"
              >
                Warning ({notifications.filter(n => n.type === 'warning').length})
              </Button>
              <Button
                variant={filterType === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('error')}
                className="gap-2"
              >
                Error ({notifications.filter(n => n.type === 'error').length})
              </Button>
              <Button
                variant={filterType === 'info' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('info')}
                className="gap-2"
              >
                Info ({notifications.filter(n => n.type === 'info').length})
              </Button>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <Card className="border-border bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground text-center">
                      No notifications found
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => {
                  const config = typeConfig[notification.type]
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
                          {notification.icon}
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
        </ScrollArea>
      </main>
    </div>
  )
}
