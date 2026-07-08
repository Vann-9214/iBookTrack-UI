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

  const [selectedTeam, setSelectedTeam] = useState<{ id: string, label: string, icon: string, color: string, shadow: string } | null>(null)

  const teams = [
    { 
      id: 'warehouse', label: 'Warehouse Team', icon: '📦', 
      desc: 'Receive lots and organize incoming boxes.',
      color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30' 
    },
    { 
      id: 'scanning', label: 'Scanning Team', icon: '🔍', 
      desc: 'Scan books and verify inventory accuracy.',
      color: 'from-emerald-400 to-emerald-500', shadow: 'shadow-emerald-500/30' 
    },
    { 
      id: 'inventory', label: 'Inventory Team', icon: '📋', 
      desc: 'Manage QA queues and verify contents.',
      color: 'from-amber-400 to-amber-500', shadow: 'shadow-amber-500/30' 
    },
    { 
      id: 'endorsement', label: 'Endorsement Team', icon: '✅', 
      desc: 'Final endorsement and quality assurance.',
      color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30' 
    },
    { 
      id: 'cutting', label: 'Cutting Team', icon: '✂️', 
      desc: 'Process physical books for the cutting phase.',
      color: 'from-rose-400 to-rose-500', shadow: 'shadow-rose-500/30' 
    },
  ]

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
    <div className="min-h-screen bg-[#f4f7f9] text-[#0f172a] font-sans overflow-x-hidden selection:bg-blue-200">
      <HeaderSection />
      
      <div className="relative min-h-[calc(100vh-64px)] pt-[64px] flex flex-col items-center justify-center px-4 py-12 lg:py-24">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-full pointer-events-none overflow-hidden flex justify-center z-0">
          <div className="absolute -top-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-300/20 to-purple-300/20 blur-3xl opacity-50" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-emerald-300/20 to-teal-300/20 blur-3xl opacity-50" />
        </div>

        <div className="relative z-10 w-full max-w-[1100px] mx-auto transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
          
          {/* --- TEAM SELECTION VIEW --- */}
          <div className={`w-full transition-all duration-700 absolute inset-x-0 ${selectedTeam ? '-translate-y-12 opacity-0 pointer-events-none scale-95' : 'translate-y-0 opacity-100 scale-100 relative'}`}>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#0f172a]">
                Choose your role
              </h1>
              <p className="text-lg text-gray-500">
                Select the team you belong to and get started with your digitization pipeline.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map(team => (
                <button 
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className="group relative flex flex-col text-left p-8 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${team.color} opacity-80`} />
                  
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br ${team.color} shadow-lg ${team.shadow} text-white transform group-hover:scale-110 transition-transform duration-300`}>
                      {team.icon}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-[#0f172a] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 transition-all">
                    {team.label}
                  </h3>
                  <p className="text-gray-500 text-[0.95rem] leading-relaxed">
                    {team.desc}
                  </p>
                </button>
              ))}
              
              {/* Login link card */}
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <p className="text-gray-500 mb-3">Already part of the team?</p>
                <button type="button" onClick={() => router.push('/login')} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 font-semibold shadow-sm hover:shadow-md transition-all text-gray-700">
                  Log in instead
                </button>
              </div>
            </div>
          </div>

          {/* --- FORM VIEW --- */}
          <div className={`w-full max-w-[460px] mx-auto transition-all duration-700 absolute left-1/2 -translate-x-1/2 ${selectedTeam ? 'translate-y-0 opacity-100 relative' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
            
            <button 
              onClick={() => setSelectedTeam(null)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-900 transition-colors mb-6 group mx-auto"
            >
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-gray-900 transition-colors">
                <svg className="transform transition-transform group-hover:-translate-x-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </div>
              View all roles
            </button>

            <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 sm:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white">
              <div className="text-center mb-8">
                {selectedTeam && (
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br ${selectedTeam.color} shadow-lg ${selectedTeam.shadow} text-white mb-5`}>
                    {selectedTeam.icon}
                  </div>
                )}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] mb-2">Create Account</h2>
                <p className="text-gray-500 text-sm">
                  Joining as <span className="font-bold text-gray-800">{selectedTeam?.label}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                
                <div>
                  <label htmlFor="name" className="block text-[0.8rem] font-bold text-gray-600 mb-1.5 ml-1">Full Name</label>
                  <input id="name" type="text" autoComplete="name" placeholder="John Doe"
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded-2xl border-0 bg-gray-100/80 px-4 text-[0.95rem] text-[#0f172a] placeholder-gray-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] shadow-inner" />
                </div>

                <div>
                  <label htmlFor="email" className="block text-[0.8rem] font-bold text-gray-600 mb-1.5 ml-1">Email Address</label>
                  <input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-2xl border-0 bg-gray-100/80 px-4 text-[0.95rem] text-[#0f172a] placeholder-gray-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] shadow-inner" />
                </div>

                <div>
                  <label htmlFor="password" className="block text-[0.8rem] font-bold text-gray-600 mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Min. 8 characters"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-2xl border-0 bg-gray-100/80 px-4 pr-12 text-[0.95rem] text-[#0f172a] placeholder-gray-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] shadow-inner" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-[0.8rem] font-bold text-gray-600 mb-1.5 ml-1">Confirm Password</label>
                  <div className="relative">
                    <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter password"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 w-full rounded-2xl border-0 bg-gray-100/80 px-4 pr-12 text-[0.95rem] text-[#0f172a] placeholder-gray-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] shadow-inner" />
                    <button type="button" onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 p-4 text-[0.85rem] font-medium text-red-600 border border-red-100 flex items-start gap-2 mt-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className={`mt-4 h-13 py-3.5 w-full rounded-2xl text-[0.95rem] font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg bg-gradient-to-r hover:opacity-90 ${selectedTeam?.color || 'from-gray-800 to-gray-900'} ${selectedTeam?.shadow}`}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Creating account…
                    </span>
                  ) : 'Create Account'}
                </button>
              </form>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

