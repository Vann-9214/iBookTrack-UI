'use client'

import { PageLoader } from '@/components/ui/page-loader'
import { useProtectedRoute } from '../hooks/useProtectedRoute'
import { useUser } from '@/hooks/use-user'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { canAccessPath } from '@/lib/route-access'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useProtectedRoute()
  const { user, isLoading } = useUser()

  const router = useRouter()
  const pathname = usePathname()

  // Whether the current role is allowed on the current page.
  // user.role is refreshed from the backend on every mount (useUser), so a role
  // change takes effect on the next navigation/refresh.
  const roleAllowed = user?.role ? canAccessPath(user.role, pathname) : false

  useEffect(() => {
    if (!user) return
    // No role yet → pending approval.
    if (!user.role) {
      router.replace('/pending-approval')
      return
    }
    // Has a role, but it is not permitted on this page → send to Dashboard,
    // which every authenticated role may access.
    if (!roleAllowed) {
      router.replace('/Dashboard')
    }
  }, [user, roleAllowed, router])

  if (isAuthenticated === null || isLoading) {
    return <PageLoader text="Authenticating..." />
  }

  if (!isAuthenticated) {
    return null
  }

  // If user is authenticated but has no role yet, wait for the redirect.
  if (user && !user.role) {
    return <PageLoader text="Redirecting..." />
  }

  // Role present but not authorized for this page — wait for the redirect
  // instead of flashing protected content.
  if (user && user.role && !roleAllowed) {
    return <PageLoader text="Redirecting..." />
  }

  return <>{children}</>
}
