'use client'

import '@/features/landing-page/styles/landing_page.css'
import { HeaderSection } from '@/features/landing-page/components'
import { RegisterForm } from '@/features/authentication/components/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="sm:min-h-screen bg-[#f4f7f9] text-[#0f172a] font-sans overflow-x-hidden sm:overflow-hidden selection:bg-blue-200">
      <HeaderSection />

      <div className="relative sm:min-h-[calc(100vh-64px)] pt-[64px] flex flex-col items-center justify-start sm:justify-center px-4 py-6 sm:py-10 lg:py-12">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-full pointer-events-none overflow-hidden flex justify-center z-0">
          <div className="absolute -top-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-300/20 to-purple-300/20 blur-3xl opacity-50" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-emerald-300/20 to-teal-300/20 blur-3xl opacity-50" />
        </div>

        <RegisterForm />
      </div>
    </div>
  )
}
