'use client'

import { PageLoader } from '@/components/ui/page-loader'
import { useProtectedRoute } from '../hooks/useProtectedRoute'
import { useUser } from '@/hooks/use-user'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useProtectedRoute()
  const { user, isLoading } = useUser()

  const router = useRouter()

  useEffect(() => {
    if (user && !user.role) {
      router.replace('/pending-approval')
    }
  }, [user, router])

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

  return <>{children}</>
}
