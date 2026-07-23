'use client'

import Image from 'next/image'
import '@/features/landing-page/styles/landing_page.css'
import { HeaderSection } from '@/features/landing-page/components'
import { LoginForm } from '@/features/authentication/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="h-screen overflow-hidden bg-white pt-[56px]">
      <HeaderSection />

      <div className="no-select flex h-[calc(100vh-56px)]">
        {/* Left Panel — desktop only */}
        <div
          className="hidden lg:flex w-[45%] flex-col items-center justify-center relative overflow-hidden flex-shrink-0"
          style={{ background: 'linear-gradient(145deg, #0f1e3a 0%, #1a3460 55%, #1f5fa8 100%)' }}
        >
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
          <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />
          <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-md gap-6">
            <Image src="/iBookTrack_logoA.png" alt="iBookTrack Logo" width={280} height={90} priority className="object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.92 }} />
            <p className="text-blue-100 text-base leading-relaxed opacity-80 mt-2">
              The unified Warehouse Management System for zero-error book digitization.
            </p>
            <div className="flex gap-6 mt-4">
              {[['6+', 'Pipeline Steps'], ['100%', 'Chain of Custody'], ['0', 'Manual Logs']].map(([val, label]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-white font-bold text-2xl" style={{ fontFamily: 'Sora, sans-serif' }}>{val}</span>
                  <span className="text-blue-200 text-xs opacity-70">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div
          className="relative flex w-full lg:w-[55%] items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #0f1e3a 0%, #1a3460 55%, #1f5fa8 100%)' }}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 lg:hidden" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
          <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full opacity-15 lg:hidden" style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />
          <div className="absolute inset-0 hidden lg:block bg-[#f8faff]" />
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
