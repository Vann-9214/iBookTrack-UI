'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import '../landing-page/landing_page.css'
import { HeaderSection } from '../landing-page/components'
import { authRequest } from '@/lib/auth-api'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    setError('')

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')

      return

    }

    if (password.length < 8) {

      setError('Password must be at least 8 characters.')

      return

    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }



    setLoading(true)

    try {
      const data = await authRequest({
        endpoint: '/api/auth/register',
        payload: { name, email, password },
      })
      console.log('Registration response:', data)
      toast.success('Registered successfully! Redirecting to login...')
      setTimeout(() => router.push('/login'), 1500)
    } catch (err: unknown) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed.')
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
              Join the team. Start managing your digitization pipeline with zero errors.
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
        <div className="relative flex w-full lg:w-[55%] items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(145deg, #0f1e3a 0%, #1a3460 55%, #1f5fa8 100%)" }}>

          {/* Mobile blobs */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 lg:hidden"
            style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
          <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full opacity-15 lg:hidden"
            style={{ background: "radial-gradient(circle, #93c5fd, transparent)" }} />

          {/* Desktop light bg override */}
          <div className="absolute inset-0 hidden lg:block bg-[#f8faff]" />

          <div className="auth-card relative z-10 w-full mx-4 lg:mx-0 max-w-[440px] bg-white rounded-2xl shadow-xl border border-white/20 lg:border-gray-100 px-6 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-8">

            {/* Logo — mobile only */}
            <div className="flex justify-center mb-3 lg:hidden">
              <Image src="/iBookTrack_logoN.png" alt="iBookTrack" width={856} height={204}
                priority className="object-contain" style={{ width: 130, height: "auto" }} />
            </div>

            {/* Heading */}
            <h1 className="font-bold text-gray-900 mb-1 text-center text-xl sm:text-2xl lg:text-[1.9rem]"
              style={{ fontFamily: "Sora, sans-serif", letterSpacing: "-0.025em" }}>
              Create your account
            </h1>
            <p className="text-center text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 leading-relaxed">
              Get started with iBookTrack — it only takes a minute.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:gap-3" noValidate>

              {/* Name */}
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="name" className="text-[0.68rem] sm:text-[0.75rem] font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                <input id="name" type="text" autoComplete="name" placeholder="Your full name"
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="h-9 sm:h-10 lg:h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-3.5 text-sm lg:text-base text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="email" className="text-[0.68rem] sm:text-[0.75rem] font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-9 sm:h-10 lg:h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-3.5 text-sm lg:text-base text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="password" className="text-[0.68rem] sm:text-[0.75rem] font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Min. 8 characters"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-9 sm:h-10 lg:h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-3.5 pr-10 text-sm lg:text-base text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <label htmlFor="confirmPassword" className="text-[0.68rem] sm:text-[0.75rem] font-semibold text-gray-500 uppercase tracking-wide">Confirm Password</label>
                <div className="relative">
                  <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 sm:h-10 lg:h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-3.5 pr-10 text-sm lg:text-base text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
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
                    Creating account…
                  </span>
                ) : 'Create Account'}
              </button>

            </form>

            <p className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-400">
              Already have an account?{' '}
              <button type="button" onClick={() => router.push('/login')}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>

  )

}

