'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Step = 'email' | 'reset'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    setStep('reset')
  }

  const handleResetSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!newPassword || !confirmPassword) {
      setError('Please complete both password fields.')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:flex w-2/5 items-center justify-center">
        <Image
          src="/iBookTrack_logoA.png"
          alt="iBookTrack Logo"
          width={650}
          height={200}
          priority
          className="object-contain"
        />
      </div>

      <div className="flex w-full lg:w-3/5 items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-5 flex justify-center">
            <Image
              src="/iBookTrack_logoN.png"
              alt="iBookTrack"
              width={150}
              height={56}
              priority
              className="object-contain h-auto"
            />
          </div>

          <h1 className="text-center text-3xl font-bold text-gray-900 mb-5">
            Forgot Password
          </h1>
          <p className="mb-8 text-center text-sm text-gray-500">Reset your password here.</p>

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-gray-600">
                  Email<span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="h-10 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
              >
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="flex flex-col gap-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="newPassword" className="text-sm font-semibold text-gray-600">
                  Create Password<span className="text-red-500">*</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-600">
                  Re-enter password<span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="h-10 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
              >
                Set password
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            Remember your password? Back to{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
