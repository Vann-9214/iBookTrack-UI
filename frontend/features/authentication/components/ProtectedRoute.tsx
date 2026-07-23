'use client'

import { PageLoader } from '@/components/ui/page-loader'
import { useProtectedRoute } from '../hooks/useProtectedRoute'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useProtectedRoute()

  if (isAuthenticated === null) {
    return <PageLoader text="Authenticating..." />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
