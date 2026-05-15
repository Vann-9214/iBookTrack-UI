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
    <div className="min-h-screen bg-white pt-[84px]">
      <HeaderSection />

      <div className="flex h-[calc(100vh-84px)] overflow-hidden bg-white">
        {/* ── Left Panel ── */}
        <div className="hidden lg:flex w-2/5 items-center justify-center pl-32">
          <Image
            src="/iBookTrack_logoA.png"
            alt="iBookTrack Logo"
            width={650}
            height={200}
            priority
            className="object-contain"
          />
        </div>

        {/* ── Right Panel ── */}
        <div className="flex w-full lg:w-3/5 items-start justify-center px-8 pt-6 pb-12">
          <div className="auth-card w-full max-w-sm">



          {/* Logo */}
          <div className="flex justify-center mb-3">
            <Image

              src="/iBookTrack_logoN.png"

              alt="iBookTrack"

              width={150}

              height={56}

              priority

              className="object-contain h-auto"

            />

          </div>

          <h1 className="text-center text-3xl font-bold text-gray-900 mb-3">
            Create an account

          </h1>
          <p className="text-center text-sm text-gray-500 mb-4">
            Create your account now.

          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>



            {/* Name */}

            <div className="flex flex-col gap-1.5">

              <label htmlFor="name" className="text-sm font-medium text-gray-700">

                Name<span className="text-red-500">*</span>

              </label>

              <input

                id="name"

                type="text"

                autoComplete="name"

                placeholder="Enter your name"

                value={name}

                onChange={(e) => setName(e.target.value)}

                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

              />

            </div>



            {/* Email */}

            <div className="flex flex-col gap-1.5">

              <label htmlFor="email" className="text-sm font-medium text-gray-700">

                Email<span className="text-red-500">*</span>

              </label>

              <input

                id="email"

                type="email"

                autoComplete="email"

                placeholder="Enter your email"

                value={email}

                onChange={(e) => setEmail(e.target.value)}

                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

              />

            </div>



            {/* Password */}

            <div className="flex flex-col gap-1.5">

              <label htmlFor="password" className="text-sm font-medium text-gray-700">

                Password<span className="text-red-500">*</span>

              </label>

              <div className="relative">

                <input

                  id="password"

                  type={showPassword ? 'text' : 'password'}

                  autoComplete="new-password"

                  placeholder="Create a password"

                  value={password}

                  onChange={(e) => setPassword(e.target.value)}

                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

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

              <p className="text-xs text-gray-400">Must be at least 8 characters.</p>

            </div>

            {/* Re-password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Re-password<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide re-password' : 'Show re-password'}
                >
                  {showConfirmPassword ? (
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

            {/* Error message */}

            {error && (

              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200" role="alert">

                {error}

              </p>

            )}



            {/* Submit */}

            <button

              type="submit"

              disabled={loading}

              className="h-10 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"

            >

              {loading ? (

                <span className="flex items-center justify-center gap-2">

                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">

                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />

                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />

                  </svg>

                  Creating account…

                </span>

              ) : (

                'Create Account'

              )}

            </button>

          </form>



          <p className="mt-6 text-center text-sm text-gray-500">

            Already have an account?{' '}

            <button

              type="button"
              onClick={() => router.push('/login')}
              className="cursor-pointer font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >

              Log in

            </button>
          </p>
          </div>
        </div>
      </div>
    </div>

  )

}

