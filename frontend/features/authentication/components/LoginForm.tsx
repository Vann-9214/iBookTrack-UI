'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getSsoLoginUrl } from '../services/auth.service'
import { useAuth } from '../hooks/useAuth'
import { useUser } from '@/hooks/use-user'

export function LoginForm() {
  const router = useRouter()
  const { login, loading } = useAuth()
  const { refreshUser } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ssoSuccess = params.get('sso_success')
    if (ssoSuccess) {
      toast.success('Innodata SSO Login successful!')
      
      const checkSsoUser = async () => {
        await refreshUser()
        // Determine role post-refresh. The safest way is to fetch user again or just redirect to dashboard
        // where ProtectedRoute will catch them, but we'll try to redirect here if possible.
        // Actually, just redirect to Dashboard. ProtectedRoute will catch it if they have no role.
        // Wait, ProtectedRoute only catches if the user context is updated! We just updated it.
        setLeaving(true)
        sessionStorage.setItem('from_login', '1')
        setTimeout(() => router.push('/Dashboard'), 300)
      }
      checkSsoUser()
    }
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    const result = await login({ email, password })
    if (result.success) {
      await refreshUser()
      setLeaving(true)
      sessionStorage.setItem('from_login', '1')
      if (result.user && !result.user.role) {
        setTimeout(() => router.push('/pending-approval'), 300)
      } else {
        setTimeout(() => router.push('/Dashboard'), 300)
      }
    } else {
      setError(result.error)
    }
  }

  return (
    <div className={`auth-card${leaving ? ' auth-card--leaving' : ''} relative z-10 w-full mx-4 lg:mx-0 max-w-[440px] bg-white rounded-2xl shadow-xl border border-white/20 lg:border-gray-100 px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10`}>
      {/* Logo — mobile only */}
      <div className="flex justify-center mb-3 sm:mb-4 lg:hidden">
        <img src="/iBookTrack_logoN.png" alt="iBookTrack" className="object-contain w-[130px] h-auto" />
      </div>

      <h1 className="font-bold text-gray-900 mb-1 text-center text-2xl sm:text-3xl lg:text-[2rem]" style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '-0.025em' }}>
        Welcome back
      </h1>
      <p className="text-center text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 leading-relaxed">
        Log in to your iBookTrack account to continue.
      </p>

      <div className="mb-6 flex flex-col gap-3">
        <a
          href={getSsoLoginUrl()}
          className="flex items-center justify-center gap-2 h-9 sm:h-10 lg:h-11 w-full rounded-xl border-2 border-[#1a3460] bg-white text-[#1a3460] text-sm lg:text-base font-bold transition hover:bg-gray-50 active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
          </svg>
          Log in with Innodata SSO
        </a>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-200" />
          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">or regular login</span>
          <div className="flex-grow border-t border-gray-200" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:gap-3.5" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-[0.7rem] sm:text-[0.78rem] font-semibold text-gray-500 uppercase tracking-wide">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 sm:h-10 lg:h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-3.5 text-sm lg:text-base text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-[0.7rem] sm:text-[0.78rem] font-semibold text-gray-500 uppercase tracking-wide">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 sm:h-10 lg:h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-3.5 pr-10 text-sm lg:text-base text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-gray-300 accent-blue-600"
            />
            <span className="text-xs sm:text-sm text-gray-500">Remember me</span>
          </label>
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-600 border border-red-100" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-0.5 h-9 sm:h-10 lg:h-11 w-full rounded-xl bg-blue-600 text-sm lg:text-base font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Logging in…
            </span>
          ) : 'Log in'}
        </button>
      </form>

      <p className="mt-4 sm:mt-5 text-center text-xs sm:text-sm text-gray-400">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={() => router.push('/register')}
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Sign up
        </button>
      </p>
    </div>
  )
}
