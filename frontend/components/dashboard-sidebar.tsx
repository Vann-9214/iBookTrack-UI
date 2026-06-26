'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLiveNotifications } from '@/hooks/use-live-notifications'
import Image from 'next/image'
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
  LayoutDashboard,
  Package,
  Warehouse,
  Archive,
  MapPin,
  CheckCircle,
  Radio,
  Map,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

type SidebarUser = {
  name: string
  email: string
  profilePicture?: string | null
}

type Notification = {
  id: number
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: string
  icon: React.ReactNode
}

const fallbackUser: SidebarUser = {
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
  const formattedName = toTitleCase(localPart)

  return formattedName || fallbackUser.name
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

function parseStoredUser(rawUser: string | null): SidebarUser | null {
  if (!rawUser) return null

  try {
    const parsed = JSON.parse(rawUser) as Partial<SidebarUser>
    const email = typeof parsed.email === 'string' ? parsed.email : ''
    const name = typeof parsed.name === 'string' && parsed.name.trim()
      ? parsed.name
      : deriveNameFromEmail(email)
    const profilePicture = typeof parsed.profilePicture === 'string' && parsed.profilePicture.trim()
      ? parsed.profilePicture
      : null

    if (!name && !email) {
      return null
    }

    return {
      name: name || fallbackUser.name,
      email: email || fallbackUser.email,
      profilePicture,
    }
  } catch {
    return null
  }
}

function decodeTokenUser(token: string | null): SidebarUser | null {
  if (!token) return null

  try {
    const payload = token.split('.')[1]

    if (!payload) return null

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = window.atob(normalizedPayload)
    const parsed = JSON.parse(decodedPayload) as {
      email?: string
      name?: string
      full_name?: string
      user_metadata?: {
        name?: string
        full_name?: string
      }
    }

    const email = parsed.email || ''
    const name = parsed.user_metadata?.full_name || parsed.user_metadata?.name || parsed.full_name || parsed.name || deriveNameFromEmail(email)

    if (!name && !email) {
      return null
    }

    return {
      name: name || fallbackUser.name,
      email: email || fallbackUser.email,
      profilePicture: null,
    }
  } catch {
    return null
  }
}

function getUserInitials(user: SidebarUser) {
  return getInitials(user.name, user.email)
}

export function DashboardSidebar() {
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [user, setUser] = useState<SidebarUser>(fallbackUser)
  const router = useRouter()
  const pathname = usePathname()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useLiveNotifications(5, 5000)

  const isActive = (href: string) => pathname === href
  const isWarehouseSection = pathname === '/warehouse-inventory' || pathname === '/inventory'
  const initials = getUserInitials(user)

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

  const navItemCls = (active: boolean) => cn(
    'group/item flex items-center gap-3 rounded-lg pl-6.5 pr-3 py-2.5 text-sm font-medium transition-colors w-full',
    active
      ? 'bg-white/20 text-white'
      : 'text-white/70 hover:bg-white/10 hover:text-white'
  )

  return (
    <aside
      className="group/sidebar relative z-20 sticky top-0 shrink-0 flex h-screen flex-col border-white/10 transition-all duration-300 ease-in-out w-[100px] hover:w-[220px] overflow-hidden"
      style={{ backgroundColor: '#1658EB' }}
      onMouseLeave={() => setWarehouseOpen(false)}
    >
      {/* Header — logo fixed, pill expands rightward on hover */}
      <div className="relative flex items-center px-3 py-3" style={{ backgroundColor: '#1658EB', height: '96px' }}>
        {/* Expanding white pill behind logo+title */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-300 overflow-hidden flex items-center w-[78px] group-hover/sidebar:w-[195px]" style={{ height: '78px' }}>
          {/* Invisible logo placeholder to reserve space inside pill */}
          <div style={{ width: '68px', flexShrink: 0 }} />
          {/* Title inside pill */}
          <span className="whitespace-nowrap font-bold text-xl pr-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 select-none">
            <span className="text-[#0058AF]">iBook</span>
            <span className="font-medium text-[#6C6E73]" style={{ fontFamily: 'var(--font-inter)' }}>Track</span>
          </span>
        </div>
        {/* Logo — fixed, never moves, floats above the pill */}
        <div className="relative z-10 shrink-0" style={{ width: '78px', height: '78px' }}>
          <Image
            src="/iBookTrack_logoN.png"
            alt="iBookTrack"
            width={78}
            height={78}
            style={{ width: '78px', height: '78px', objectFit: 'contain', pointerEvents: 'none' }}
            priority
          />
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1 max-h-screen" role="navigation" aria-label="Main navigation">

        {/* Dashboard */}
        <button
          onClick={() => router.push('/Dashboard')}
          className={navItemCls(isActive('/Dashboard'))}
          aria-current={isActive('/Dashboard') ? 'page' : undefined}
          title="Dashboard"
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            Dashboard
          </span>
        </button>

        {/* Warehouse & Inventory (expandable) */}
        <div>
          <button
            onClick={() => setWarehouseOpen((prev) => !prev)}
            className={navItemCls(isWarehouseSection)}
            title="Warehouse & Inventory"
          >
            <Package className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate text-left whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
              Warehouse &amp; Inventory
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200 opacity-0 group-hover/sidebar:opacity-100',
                warehouseOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Sub-items */}
          {warehouseOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-white/20 pl-3">
              <button
                onClick={() => router.push('/warehouse-inventory')}
                className={navItemCls(isActive('/warehouse-inventory'))}
                aria-current={isActive('/warehouse-inventory') ? 'page' : undefined}
              >
                <Warehouse className="h-4 w-4 shrink-0" />
                <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Warehouse</span>
              </button>
              <button
                onClick={() => router.push('/inventory')}
                className={navItemCls(isActive('/inventory'))}
                aria-current={isActive('/inventory') ? 'page' : undefined}
              >
                <Archive className="h-4 w-4 shrink-0" />
                <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Inventory</span>
              </button>
            </div>
          )}
        </div>

        {/* Station Checkpoints */}
        <button
          onClick={() => router.push('/checkpoints')}
          className={navItemCls(isActive('/checkpoints'))}
          aria-current={isActive('/checkpoints') ? 'page' : undefined}
          title="Station Checkpoints"
        >
          <MapPin className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Station Checkpoints</span>
        </button>

        {/* Book Inspection & Endorsement */}
        <button
          onClick={() => router.push('/qa')}
          className={navItemCls(isActive('/qa'))}
          aria-current={isActive('/qa') ? 'page' : undefined}
          title="Book Inspection & Endorsement"
        >
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Book Inspection &amp; Endorsement</span>
        </button>

        {/* Transmission Monitor */}
        <button
          onClick={() => router.push('/transmission')}
          className={navItemCls(isActive('/transmission'))}
          aria-current={isActive('/transmission') ? 'page' : undefined}
          title="Transmission Monitor"
        >
          <Radio className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Transmission Monitor</span>
        </button>

        {/* Warehouse Locator */}
        <button
          onClick={() => router.push('/locator')}
          className={navItemCls(isActive('/locator'))}
          aria-current={isActive('/locator') ? 'page' : undefined}
          title="Warehouse Locator"
        >
          <Map className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Storage Locator</span>
        </button>

        {/* Reports */}
        <button
          onClick={() => router.push('/reports')}
          className={navItemCls(isActive('/reports'))}
          aria-current={isActive('/reports') ? 'page' : undefined}
          title="Reports"
        >
          <BarChart3 className="h-5 w-5 shrink-0" />
          <span className="truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Reports</span>
        </button>

      </nav>

      <div className="h-px bg-white/10" />

      {/* Footer */}
      <div className="px-3 py-4">
        {/* Notifications */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              className="pl-6.5 mb-3 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
              title="Notifications"
              type="button"
            >
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Notifications</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 rounded-2xl p-0"
            onCloseAutoFocus={(event) => event.preventDefault()}
            side="top"
            sideOffset={10}
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
                const typeStyles = {
                  success: 'bg-success/10 text-success',
                  warning: 'bg-warning/10 text-warning',
                  error: 'bg-destructive/10 text-destructive',
                  info: 'bg-info/10 text-blue-500',
                }
                const iconMap = {
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

        {/* User account */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="pl-4.5 flex w-full items-center gap-3 rounded-[1.75rem] border border-white/10 bg-white/10 px-3 py-3 text-left transition-colors hover:bg-white/20"
              title="Account"
            >
              <Avatar className="h-9 w-9 shrink-0 border border-white/20">
                <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                <AvatarFallback className="bg-white/20 text-sm font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                <span className="block truncate text-sm font-semibold text-white whitespace-nowrap">
                  {user.name}
                </span>
                <span className="block truncate text-xs text-white/60 whitespace-nowrap">
                  {user.email}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-64 rounded-2xl p-2"
            onCloseAutoFocus={(event) => event.preventDefault()}
            side="top"
            sideOffset={10}
          >
            <DropdownMenuLabel className="px-3 py-2">
              <span className="block truncate text-sm font-semibold text-foreground">
                {user.name}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5" onClick={() => router.push('/settings')}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5" onClick={handleLogout} variant="destructive">
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
