'use client'

import { PageLoader } from '@/components/ui/page-loader'
import { useProtectedRoute } from '../hooks/useProtectedRoute'
import { useUser } from '@/hooks/use-user'
import { PendingApproval } from '@/components/pending-approval'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useProtectedRoute()
  const { user, isLoading } = useUser()

  if (isAuthenticated === null || isLoading) {
    return <PageLoader text="Authenticating..." />
  }

  if (!isAuthenticated) {
    return null
  }

  // If user is authenticated but has no role yet, they need admin approval.
  if (user && !user.role) {
    return <PendingApproval />
  }

  return <>{children}</>
}
