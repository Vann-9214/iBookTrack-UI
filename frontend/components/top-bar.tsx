'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useBrand, BRAND_COLORS, type Brand } from '@/hooks/use-brand'
import { useLiveNotifications } from '@/hooks/use-live-notifications'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Settings,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type NavbarUser = {
  name: string
  email: string
  profilePicture?: string | null
}

const fallbackUser: NavbarUser = {
  name: 'User Account',
  email: 'No email available',
}

function toTitleCase(value: string) {
  return value
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function deriveNameFromEmail(email?: string) {
  if (!email) return fallbackUser.name
  const localPart = email.split('@')[0]
  return toTitleCase(localPart) || fallbackUser.name
}

function getInitials(name: string, email: string) {
  const source = name !== fallbackUser.name ? name : deriveNameFromEmail(email)
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return initials || 'UA'
}

function parseStoredUser(rawUser: string | null): NavbarUser | null {
  if (!rawUser) return null
  try {
    const parsed = JSON.parse(rawUser) as Partial<NavbarUser>
    const email = typeof parsed.email === 'string' ? parsed.email : ''
    const name = typeof parsed.name === 'string' && parsed.name.trim()
      ? parsed.name
      : deriveNameFromEmail(email)
    const profilePicture = typeof parsed.profilePicture === 'string' && parsed.profilePicture.trim()
      ? parsed.profilePicture
      : null
    if (!name && !email) return null
    return { name: name || fallbackUser.name, email: email || fallbackUser.email, profilePicture }
  } catch {
    return null
  }
}

function SessionOngoingTooltip({
  children,
  side = 'bottom',
}: {
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={8} variant="destructive">
        Session Ongoing
      </TooltipContent>
    </Tooltip>
  )
}

function decodeTokenUser(token: string | null): NavbarUser | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = window.atob(normalizedPayload)
    const parsed = JSON.parse(decodedPayload) as {
      email?: string; name?: string; full_name?: string
      user_metadata?: { name?: string; full_name?: string }
    }
    const email = parsed.email || ''
    const name = parsed.user_metadata?.full_name || parsed.user_metadata?.name || parsed.full_name || parsed.name || deriveNameFromEmail(email)
    if (!name && !email) return null
    return { name: name || fallbackUser.name, email: email || fallbackUser.email, profilePicture: null }
  } catch {
    return null
  }
}

export function DashboardNavbar({ disableBrandToggle, navigationLocked }: { disableBrandToggle?: boolean; navigationLocked?: boolean } = {}) {
  const [user, setUser] = useState<NavbarUser>(fallbackUser)
  const router = useRouter()
  const { brand, setBrand, colors } = useBrand()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useLiveNotifications(5, 5000)
  const initials = getInitials(user.name, user.email)

  useEffect(() => {
    const syncUser = () => {
      const storedUser = parseStoredUser(window.localStorage.getItem('ibooktrack_user'))
      const tokenUser = decodeTokenUser(window.localStorage.getItem('access_token'))
      const profilePicture = window.localStorage.getItem('ibooktrack_profile_picture')
      setUser({
        ...(storedUser ?? tokenUser ?? fallbackUser),
        profilePicture: storedUser?.profilePicture ?? profilePicture,
      })
    }
    syncUser()
    window.addEventListener('storage', syncUser)
    window.addEventListener('ibooktrack-user-updated', syncUser as EventListener)
    return () => {
      window.removeEventListener('storage', syncUser)
      window.removeEventListener('ibooktrack-user-updated', syncUser as EventListener)
    }
  }, [])

  const handleLogout = () => {
    window.localStorage.removeItem('access_token')
    window.localStorage.removeItem('ibooktrack_user')
    window.sessionStorage.removeItem('from_login')
    router.push('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      {/* Mustang / Jaguar toggle */}
      <div className="flex items-center rounded-full border border-muted/20 bg-gray-200 p-0.5">
        {(['mustang', 'jaguar'] as Brand[]).map((b) => (
          disableBrandToggle ? (
            <SessionOngoingTooltip key={b} side="bottom">
              <span className="inline-flex">
                <button
                  onClick={() => setBrand(b)}
                  disabled
                  className={cn(
                    'px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 capitalize opacity-50 cursor-not-allowed',
                    brand === b
                      ? 'text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={brand === b ? { backgroundColor: BRAND_COLORS[b].accent } : undefined}
                >
                  {BRAND_COLORS[b].label}
                </button>
              </span>
            </SessionOngoingTooltip>
          ) : (
            <button
              key={b}
              onClick={() => setBrand(b)}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 capitalize',
                brand === b
                  ? 'text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              style={brand === b ? { backgroundColor: BRAND_COLORS[b].accent } : undefined}
            >
              {BRAND_COLORS[b].label}
            </button>
          )
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      {navigationLocked ? (
        <SessionOngoingTooltip side="bottom">
          <span className="inline-flex">
            <button
              aria-label="Notifications"
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent/10 hover:text-foreground',
                'pointer-events-none opacity-50 cursor-not-allowed',
              )}
              type="button"
              disabled
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </span>
        </SessionOngoingTooltip>
      ) : (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent/10 hover:text-foreground"
              type="button"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 rounded-2xl p-0"
            onCloseAutoFocus={(event) => event.preventDefault()}
            sideOffset={8}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Live notifications will appear here as activity is recorded.
                </div>
              ) : notifications.map((notification) => {
                const typeStyles: Record<string, string> = {
                  success: 'bg-success/10 text-success',
                  warning: 'bg-warning/10 text-warning',
                  error: 'bg-destructive/10 text-destructive',
                  info: 'bg-info/10 text-blue-500',
                }
                const iconMap: Record<string, React.ReactNode> = {
                  success: <CheckCircle2 className="h-4 w-4" />,
                  warning: <AlertTriangle className="h-4 w-4" />,
                  error: <XCircle className="h-4 w-4" />,
                  info: <AlertCircle className="h-4 w-4" />,
                }
                return (
                  <button
                    key={notification.id}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', typeStyles[notification.type])}>
                        {iconMap[notification.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground truncate">{notification.title}</p>
                          {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{notification.timestamp}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="px-4 py-2 border-t border-border">
              <button
                onClick={() => router.push('/notifications')}
                className="text-xs font-medium text-primary hover:underline w-full text-center"
              >
                View All Notifications
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* User profile */}
      {navigationLocked ? (
        <SessionOngoingTooltip side="bottom">
          <span className="inline-flex">
            <button
              type="button"
              aria-label="Account"
              className="flex items-center gap-2.5 rounded-full border border-border px-2 py-1.5 transition hover:bg-muted pointer-events-none opacity-50 cursor-not-allowed"
              disabled
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                {user.name}
              </span>
            </button>
          </span>
        </SessionOngoingTooltip>
      ) : (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account"
              className="flex items-center gap-2.5 rounded-full border border-border px-2 py-1.5 transition hover:bg-muted"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                {user.name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 rounded-2xl p-2"
            onCloseAutoFocus={(event) => event.preventDefault()}
            sideOffset={8}
          >
            <DropdownMenuLabel className="px-3 py-2">
              <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="group gap-3 rounded-xl px-3 py-2.5" onClick={() => router.push('/settings')}>
              <Settings className="h-4 w-4 group-hover:text-white group-focus:text-white" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5" onClick={handleLogout} variant="destructive">
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
