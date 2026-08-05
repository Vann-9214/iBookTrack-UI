'use client'

import { Mail, Clock, LogOut, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '@/features/authentication/hooks/useAuth'
import { useUser } from '@/hooks/use-user'
import { useState } from 'react'

export function PendingApproval() {
  const { logout } = useAuth()
  const { user, refreshUser } = useUser()
  const [checking, setChecking] = useState(false)

  const handleCheckStatus = async () => {
    setChecking(true)
    await refreshUser()
    setTimeout(() => setChecking(false), 1200)
  }

  return (
    <div className="min-h-[100dvh] overflow-y-auto flex items-start sm:items-center justify-center px-2.5 py-4 sm:p-4 relative"
      style={{ background: 'linear-gradient(145deg, #0f1e3a 0%, #1a3460 55%, #1f5fa8 100%)' }}
    >
      {/* Ambient glow orbs */}
      <div className="fixed -top-24 -left-24 sm:-top-32 sm:-left-32 w-72 sm:w-[500px] h-72 sm:h-[500px] rounded-full opacity-[0.12] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
      <div className="fixed -bottom-28 -right-16 sm:-bottom-40 sm:-right-24 w-80 sm:w-[600px] h-80 sm:h-[600px] rounded-full opacity-[0.10] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />

      <div className="relative z-10 w-full max-w-[460px]">
        {/* Logo */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <img
            src="/iBookTrack_logoN.png"
            alt="iBookTrack"
            className="h-8 sm:h-12 object-contain drop-shadow-lg"
          />
        </div>

        {/* Main card */}
        <div className="backdrop-blur-xl bg-white/[0.07] border border-white/[0.12] rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* Top accent stripe */}
          <div className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316, #ef4444, #f59e0b)' }} />

          {/* Header section */}
          <div className="px-4 sm:px-8 pt-5 sm:pt-10 pb-3 sm:pb-6 text-center">
            {/* Animated clock icon */}
            <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-6">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-1 rounded-full bg-amber-400/10" />
              <div className="relative w-full h-full rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15))' }}
              >
                <Clock className="w-6 h-6 sm:w-9 sm:h-9 text-amber-400" strokeWidth={1.8} />
              </div>
            </div>

            <h1 className="text-lg sm:text-[1.65rem] font-bold text-white tracking-tight mb-1 sm:mb-2"
              style={{ fontFamily: 'Sora, Inter, sans-serif' }}
            >
              Account Pending Approval
            </h1>
            <p className="text-blue-200/70 text-[11px] sm:text-sm leading-relaxed mx-auto">
              Your account was created successfully. An admin needs to assign your role before you can access the system.
            </p>
          </div>

          {/* User info pill */}
          {user && (
            <div className="mx-4 sm:mx-8 mb-3 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white/[0.06] border border-white/[0.08]">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                >
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-[11px] sm:text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-blue-300/60 text-[9px] sm:text-xs truncate">{user.email}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider bg-amber-400/15 text-amber-400 border border-amber-400/20 shrink-0">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Pending
                </span>
              </div>
            </div>
          )}

          {/* Steps / what happens next */}
          <div className="mx-4 sm:mx-8 mb-3 sm:mb-6">
            <div className="rounded-lg sm:rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 sm:p-5">
              <h3 className="text-white/90 text-[9px] sm:text-xs font-bold uppercase tracking-wider mb-2.5 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
                What happens next
              </h3>
              <div className="space-y-2 sm:space-y-3.5">
                {[
                  { step: '1', text: 'An administrator reviews your account', done: true },
                  { step: '2', text: 'A role is assigned based on your team', done: false },
                  { step: '3', text: 'You get full access to the system', done: false },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-2 sm:gap-3">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold shrink-0 mt-px transition ${
                      item.done
                        ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                        : 'bg-white/[0.06] text-white/40 border border-white/[0.10]'
                    }`}>
                      {item.done ? '✓' : item.step}
                    </div>
                    <p className={`text-[11px] sm:text-sm leading-relaxed ${item.done ? 'text-white/70' : 'text-white/40'}`}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div className="mx-4 sm:mx-8 mb-3 sm:mb-6">
            <div className="flex items-start gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-blue-400/[0.06] border border-blue-400/[0.12]">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.2))' }}
              >
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white/90 text-[11px] sm:text-sm font-semibold">Need access urgently?</h3>
                <p className="text-blue-200/50 text-[10px] sm:text-xs mt-0.5 sm:mt-1 leading-relaxed">
                  Contact your supervisor or admin to expedite your role assignment.
                </p>
                <a
                  href="mailto:support@innodata.com"
                  className="inline-flex items-center gap-1 text-blue-400 text-[10px] sm:text-xs font-semibold mt-1 sm:mt-2 hover:text-blue-300 transition-colors group"
                >
                  support@innodata.com
                  <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 sm:px-8 pb-5 sm:pb-8 flex flex-col gap-2 sm:gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full h-9 sm:h-11 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold text-white transition duration-200 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] shadow-lg shadow-blue-500/20"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
            >
              {checking ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Check Approval Status
                </>
              )}
            </button>
            <button
              onClick={logout}
              className="w-full h-8 sm:h-10 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition duration-200 flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] sm:text-[11px] text-blue-200/30 mt-3 sm:mt-6">
          InnoTrack · Powered by Innodata
        </p>
      </div>
    </div>
  )
}
