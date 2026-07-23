'use client'

import { useRouter } from 'next/navigation'
import type { AuthTeam } from '../types/auth.types'

const teams: AuthTeam[] = [
  { id: 'warehouse', label: 'Warehouse Team', icon: '📦', desc: 'Receive lots and organize incoming boxes.', color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30' },
  { id: 'scanning', label: 'Scanning Team', icon: '🔍', desc: 'Scan books and verify inventory accuracy.', color: 'from-emerald-400 to-emerald-500', shadow: 'shadow-emerald-500/30' },
  { id: 'inventory', label: 'Inventory Team', icon: '📋', desc: 'Manage QA queues and verify contents.', color: 'from-amber-400 to-amber-500', shadow: 'shadow-amber-500/30' },
  { id: 'endorsement', label: 'Endorsement Team', icon: '✅', desc: 'Final endorsement and quality assurance.', color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30' },
  { id: 'cutting', label: 'Cutting Team', icon: '✂️', desc: 'Process physical books for the cutting phase.', color: 'from-rose-400 to-rose-500', shadow: 'shadow-rose-500/30' },
]

interface RegisterTeamSelectorProps {
  onSelect: (team: AuthTeam) => void
}

export function RegisterTeamSelector({ onSelect }: RegisterTeamSelectorProps) {
  const router = useRouter()

  return (
    <div className="w-full">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#0f172a]">Choose your role</h1>
        <p className="text-lg text-gray-500">Select the team you belong to and get started with your digitization pipeline.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => onSelect(team)}
            className="group relative flex flex-col text-left p-8 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${team.color} opacity-80`} />
            <div className="flex items-center justify-between mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br ${team.color} shadow-lg ${team.shadow} text-white transform group-hover:scale-110 transition-transform duration-300`}>
                {team.icon}
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6 6-6" /></svg>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 text-[#0f172a] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 transition-all">
              {team.label}
            </h3>
            <p className="text-gray-500 text-[0.95rem] leading-relaxed">{team.desc}</p>
          </button>
        ))}

        <div className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
          <p className="text-gray-500 mb-3">Already part of the team?</p>
          <button type="button" onClick={() => router.push('/login')} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 font-semibold shadow-sm hover:shadow-md transition-all text-gray-700">
            Log in instead
          </button>
        </div>
      </div>
    </div>
  )
}
