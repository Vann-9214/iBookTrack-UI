'use client'

import Image from 'next/image'
import '../landing-page/landing_page.css'
import { HeaderSection } from '../landing-page/components'
import { ForgotPasswordForm } from '@/features/authentication/components/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-white pt-[84px]">
      <HeaderSection />

      <div className="flex h-[calc(100vh-84px)] overflow-hidden bg-white">
        <div className="hidden lg:flex w-2/5 items-center justify-center pl-32">
          <Image src="/iBookTrack_logoA.png" alt="iBookTrack Logo" width={650} height={200} priority className="object-contain" />
        </div>

        <div className="flex w-full lg:w-3/5 items-start justify-center px-8 pt-20 pb-12">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
