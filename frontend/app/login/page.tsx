'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import '../landing-page/landing_page.css'
import { HeaderSection } from '../landing-page/components'
import { authRequest, storeTokenData, getApiBaseUrl } from '@/lib/auth-api'

function getDisplayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] || ''

  const formattedName = localPart
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

  return formattedName || 'User Account'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Handle SSO token callback
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ssoSuccess = params.get('sso_success')
      const ssoEmail = params.get('email')
      const ssoName = params.get('name')

      if (ssoSuccess) {
        setLoading(true)
        // Tokens are now stored as HttpOnly cookies automatically by the backend
        
        const emailToUse = ssoEmail || 'user@innodata.com'
        toast.success('Innodata SSO Login successful!')
        setLeaving(true)
        sessionStorage.setItem('from_login', '1')
        setTimeout(() => router.push('/Dashboard'), 300)
      }
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError('')



    if (!email || !password) {

      setError('Please enter your email and password.')

      return

    }



    setLoading(true)

    try {
      const data = await authRequest({
        endpoint: '/api/auth/login',
        payload: { email, password },
      })
      // Tokens are now stored as HttpOnly cookies automatically by the backend
      toast.success('Login successful!')
      setLeaving(true)
      sessionStorage.setItem('from_login', '1')
      setTimeout(() => router.push('/Dashboard'), 300)
    } catch (err: unknown) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }

  }



  return (
    /* Full viewport, no scroll ever */
    <div className="h-screen overflow-hidden bg-white pt-[56px]">
      <HeaderSection />

      <div className="no-select flex h-[calc(100vh-56px)]">
        {/* ── Left Panel — desktop only ── */}
        <div className="hidden lg:flex w-[45%] flex-col items-center justify-center relative overflow-hidden flex-shrink-0"
          style={{ background: "linear-gradient(145deg, #0f1e3a 0%, #1a3460 55%, #1f5fa8 100%)" }}>
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
          <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #93c5fd, transparent)" }} />
          <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-md gap-6">
            <Image src="/iBookTrack_logoA.png" alt="iBookTrack Logo" width={280} height={90} priority
              className="object-contain" style={{ filter: "brightness(0) invert(1)", opacity: 0.92 }} />
            <p className="text-blue-100 text-base leading-relaxed opacity-80 mt-2">
              The unified Warehouse Management System for zero-error book digitization.
            </p>
            <div className="flex gap-6 mt-4">
              {[["6+", "Pipeline Steps"], ["100%", "Chain of Custody"], ["0", "Manual Logs"]].map(([val, label]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-white font-bold text-2xl" style={{ fontFamily: "Sora, sans-serif" }}>{val}</span>
                  <span className="text-blue-200 text-xs opacity-70">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        {/* Mobile: dark gradient bg matching left panel; Desktop: light bg */}
        <div className="relative flex w-full lg:w-[55%] items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(145deg, #0f1e3a 0%, #1a3460 55%, #1f5fa8 100%)" }}>

          {/* Mobile-only decorative blobs (hidden on lg, shown on mobile) */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 lg:hidden"
            style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
          <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full opacity-15 lg:hidden"
            style={{ background: "radial-gradient(circle, #93c5fd, transparent)" }} />

          {/* On desktop override back to light bg */}
          <div className="absolute inset-0 hidden lg:block bg-[#f8faff]" />

          <div className={`auth-card${leaving ? ' auth-card--leaving' : ''} relative z-10 w-full mx-4 lg:mx-0 max-w-[440px] bg-white rounded-2xl shadow-xl border border-white/20 lg:border-gray-100 px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10`}>

            {/* Logo — mobile only */}
            <div className="flex justify-center mb-3 sm:mb-4 lg:hidden">
              <Image src="/iBookTrack_logoN.png" alt="iBookTrack" width={856} height={204}
                priority className="object-contain" style={{ width: 130, height: "auto" }} />
            </div>

            {/* Heading */}
            <h1 className="font-bold text-gray-900 mb-1 text-center text-2xl sm:text-3xl lg:text-[2rem]"
              style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.025em" }}>
              Welcome back
            </h1>
            <p className="text-center text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 leading-relaxed">
              Log in to your iBookTrack account to continue.
            </p>

            <div className="mb-6 flex flex-col gap-3">
              <button type="button" onClick={() => window.location.href = `${getApiBaseUrl()}/api/auth/innodata`}
                className="flex items-center justify-center gap-2 h-9 sm:h-10 lg:h-11 w-full rounded-xl border-2 border-[#1a3460] bg-white text-[#1a3460] text-sm lg:text-base font-bold transition hover:bg-gray-50 active:scale-[0.98]">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
                Log in with Innodata SSO
              </button>
              
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">or regular login</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:gap-3.5" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-[0.7rem] sm:text-[0.78rem] font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-9 sm:h-10 lg:h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-3.5 text-sm lg:text-base text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-[0.7rem] sm:text-[0.78rem] font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-9 sm:h-10 lg:h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-3.5 pr-10 text-sm lg:text-base text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
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

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-gray-300 accent-blue-600" />
                  <span className="text-xs sm:text-sm text-gray-500">Remember me</span>
                </label>
                <button type="button" onClick={() => router.push('/forgot-password')}
                  className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-600 border border-red-100" role="alert">{error}</p>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="mt-0.5 h-9 sm:h-10 lg:h-11 w-full rounded-xl bg-blue-600 text-sm lg:text-base font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-200">
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
              <button type="button" onClick={() => router.push('/register')}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>

  )

}

