'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { resetPassword } from '@/lib/auth-api'
import type { AuthStep } from '../types/auth.types'

export function ForgotPasswordForm() {
  const router = useRouter()
  const [step, setStep] = useState<AuthStep>('email')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    setStep('reset')
  }

  const handleResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!newPassword || !confirmPassword) {
      setError('Please complete both password fields.')
      return
    }
    // Mirror the backend rules so users get instant feedback.
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must be 8+ characters with an uppercase, lowercase, and a number.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(email.trim(), newPassword)
      toast.success('Password reset successfully. Please log in.')
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-card w-full max-w-sm">
      <div className="mb-5 flex justify-center">
        <img src="/iBookTrack_logoN.png" alt="iBookTrack" className="object-contain h-auto w-[150px]" />
      </div>

      <h1 className="text-center text-3xl font-bold text-gray-900 mb-5">Forgot Password</h1>
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
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</p>
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
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="h-10 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting password…' : 'Set password'}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        Remember your password? Back to{' '}
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700"
        >
          Log in
        </button>
      </p>
    </div>
  )
}
