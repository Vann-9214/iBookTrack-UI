'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { login, register, logout, getCurrentUser, getSsoLoginUrl } from '../services/auth.service'
import type { AuthUser, LoginCredentials, RegisterCredentials } from '../types/auth.types'

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  const fetchUser = useCallback(async () => {
    const profile = await getCurrentUser()
    setUser(profile)
    setChecking(false)
  }, [])

  useEffect(() => {
    void fetchUser()
  }, [fetchUser])

  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true)
    try {
      const data = await login(credentials)
      if (data.error) throw new Error(data.error)
      toast.success('Login successful!')
      return { success: true as const, user: data.user }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.'
      toast.error(message)
      return { success: false as const, error: message }
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleRegister = useCallback(async (credentials: RegisterCredentials) => {
    setLoading(true)
    try {
      const data = await register(credentials)
      if (data.error) throw new Error(data.error)
      toast.success('Registered successfully! Redirecting to login...')
      setTimeout(() => router.push('/login'), 1500)
      return { success: true as const }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed.'
      toast.error(message)
      return { success: false as const, error: message }
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleLogout = useCallback(async () => {
    await logout()
    setUser(null)
    router.push('/login')
  }, [router])

  const handleSsoLogin = useCallback(() => {
    window.location.href = getSsoLoginUrl()
  }, [])

  return {
    user,
    loading,
    checking,
    fetchUser,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    ssoLogin: handleSsoLogin,
  }
}
