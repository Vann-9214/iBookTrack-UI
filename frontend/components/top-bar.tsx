'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useBrand, BRAND_COLORS, type Brand } from '@/hooks/use-brand'
import { clearTokenData, fetchUserProfile } from '@/lib/auth-api'

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
  ScanLine,
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

  const initials = getInitials(user.name, user.email)

  useEffect(() => {
    const syncUser = async () => {
      const profile = await fetchUserProfile()
      const profilePicture = window.localStorage.getItem('ibooktrack_profile_picture')
      if (profile) {
        setUser({
          name: profile.name || fallbackUser.name,
          email: profile.email || fallbackUser.email,
          profilePicture: profilePicture
        })
      } else {
        setUser(fallbackUser)
      }
    }
    syncUser()
  }, [])

  const handleLogout = async () => {
    await clearTokenData()
    window.sessionStorage.removeItem('from_login')
    router.push('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-white px-6 md:px-6 pl-14 md:pl-6">
      {/* Mustang / Jaguar toggle */}
      <div className="relative flex items-center rounded-full border border-muted/20 bg-gray-200 p-0.5 w-[160px]">
        {/* Animated Background Pill */}
        <div 
          className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ease-out shadow-sm pointer-events-none"
          style={{
            width: 'calc(50% - 2px)',
            left: brand === 'mustang' ? '2px' : '50%',
            backgroundColor: BRAND_COLORS[brand].accent,
          }}
        />
        {(['mustang', 'jaguar'] as Brand[]).map((b) => {
          const isSelected = brand === b;
          return disableBrandToggle ? (
            <SessionOngoingTooltip key={b} side="bottom">
              <span className="relative z-10 flex-1 flex justify-center">
                <button
                  onClick={() => setBrand(b)}
                  disabled
                  className={cn(
                    'w-full py-1.5 text-xs font-semibold rounded-full transition-colors duration-300 capitalize opacity-50 cursor-not-allowed',
                    isSelected ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                  )}
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
                'relative z-10 flex-1 py-1.5 text-xs font-semibold rounded-full transition-colors duration-300 capitalize',
                isSelected ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {BRAND_COLORS[b].label}
            </button>
          )
        })}
      </div>

      {/* Scan QR button — mobile only */}
      <button
        onClick={() => router.push('/scan-qr')}
        className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full border border-border bg-background hover:bg-muted transition"
        aria-label="Scan QR"
        style={{ color: colors.accent }}
      >
        <ScanLine className="w-5 h-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />


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
