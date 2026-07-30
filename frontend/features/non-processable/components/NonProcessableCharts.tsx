import { cn } from '@/lib/utils'
import { Check, TrendingUp, Inbox } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { LotGroup } from '../types'
import { getTone } from '../utils/constants'

interface NonProcessableChartsProps {
  timelineData: any[]
  structuredLots: LotGroup[]
  loading: boolean
  isJaguar: boolean
}

export function NonProcessableCharts({
  timelineData,
  structuredLots,
  loading,
  isJaguar
}: NonProcessableChartsProps) {
  const TONE = getTone(isJaguar)
  const dynamicTone = TONE.theme

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 mt-2">
      
      {/* Timeline Graph */}
      <div className={cn("rounded-2xl border p-5 shadow-sm ring-1 flex flex-col h-96 transition-colors duration-300 lg:col-span-2 bg-white relative overflow-hidden group/timeline", dynamicTone.card)}>
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-1">
              Timeline
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Non-processable items flagged over time</p>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full text-white shadow-sm transition-transform duration-300 group-hover/timeline:scale-105", 
            isJaguar ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/40" : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/40"
          )}>
            <TrendingUp className="h-3.5 w-3.5 opacity-90" />
            Selected Period
          </div>
        </div>
        
        <div className="flex-1 w-full min-h-0 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFlags" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isJaguar ? '#10b981' : '#3b82f6'} stopOpacity={0.35}/>
                  <stop offset="50%" stopColor={isJaguar ? '#10b981' : '#3b82f6'} stopOpacity={0.1}/>
                  <stop offset="100%" stopColor={isJaguar ? '#10b981' : '#3b82f6'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.7} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                dy={12}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                allowDecimals={false}
              />
              <RechartsTooltip 
                cursor={{ stroke: isJaguar ? '#10b981' : '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.5 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/10 flex flex-col gap-1.5 min-w-[120px] transform transition-all">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">{label}</span>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full shadow-lg", isJaguar ? "bg-emerald-400 shadow-emerald-400/50" : "bg-blue-400 shadow-blue-400/50")} />
                          <span className="font-black text-xl text-white leading-none">
                            {payload[0].value} <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-0.5">flags</span>
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="flags" 
                stroke={isJaguar ? '#10b981' : '#3b82f6'} 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorFlags)" 
                activeDot={{ 
                  r: 6, 
                  strokeWidth: 3, 
                  stroke: '#ffffff',
                  fill: isJaguar ? '#10b981' : '#3b82f6',
                  style: { filter: `drop-shadow(0px 4px 8px ${isJaguar ? 'rgba(16,185,129,0.5)' : 'rgba(59,130,246,0.5)'})` }
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Worst Lots Graph */}
      <div className={cn(
        "rounded-2xl border p-5 shadow-sm ring-1 flex flex-col h-96 transition-colors duration-300 lg:col-span-1 bg-white relative overflow-hidden group/card",
        dynamicTone.card
      )}>
        {/* Hover Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 opacity-0 group-hover/card:opacity-100 blur-xl transition-opacity duration-700 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-8">
          <div>
            <h3 className="font-bold tracking-tight text-gray-800 flex items-center gap-2 mb-1">
              Worst Lots
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Top 5 by flag count</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-white shadow-sm text-red-700 ring-1 ring-red-200/50">
            Top 5
          </div>
        </div>
        
        <div className="flex-1 w-full min-h-0 relative z-10 flex flex-col justify-center">
          {structuredLots.length === 0 && !loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={cn(
                "flex w-12 h-12 rounded-full items-center justify-center shadow-sm mb-3",
                isJaguar ? "bg-emerald-100" : "bg-blue-100"
              )}>
                <Inbox className={cn("h-6 w-6", isJaguar ? "text-emerald-600" : "text-blue-600")} />
              </div>
              <span className="font-medium text-gray-600 text-sm">No worst lots found</span>
            </div>
          ) : (
            <div className="flex items-end justify-around gap-2 px-2 w-full h-[240px] pb-14 pt-8 border-b border-slate-100 relative mt-4">
              {/* Subtle background grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-14 pt-8 z-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-full h-px bg-slate-100" />
                ))}
              </div>

              {(() => {
                const top5Lots = structuredLots.slice(0, 5);
                
                // Fixed podium order to maintain placeholder positions
                const podiumOrder = [3, 1, 0, 2, 4];
                const arrangedLots = podiumOrder.map(i => ({ lot: top5Lots[i], originalIndex: i }));

                return arrangedLots.map(({ lot, originalIndex: index }) => {
                  if (!lot) {
                    return <div key={`empty-${index}`} className="w-full h-full" />
                  }
                  
                  const maxFlags = Math.max(1, ...top5Lots.map(l => l.totalFlags));
                  const percent = Math.max(Math.round((lot.totalFlags / maxFlags) * 100), 8); // Minimum 8% height so it's visible
                
                // Premium color palette transitioning from deep red to amber
                const barStyles = [
                  { bg: 'from-rose-500 to-red-600', shadow: 'shadow-red-500/40', glow: 'group-hover:shadow-[0_0_16px_rgba(225,29,72,0.6)]' },
                  { bg: 'from-red-500 to-orange-500', shadow: 'shadow-orange-500/40', glow: 'group-hover:shadow-[0_0_16px_rgba(249,115,22,0.6)]' },
                  { bg: 'from-orange-500 to-amber-500', shadow: 'shadow-amber-500/40', glow: 'group-hover:shadow-[0_0_16px_rgba(245,158,11,0.6)]' },
                  { bg: 'from-amber-400 to-yellow-500', shadow: 'shadow-yellow-500/40', glow: 'group-hover:shadow-[0_0_16px_rgba(234,179,8,0.6)]' },
                  { bg: 'from-yellow-400 to-yellow-500', shadow: 'shadow-yellow-400/40', glow: 'group-hover:shadow-[0_0_16px_rgba(250,204,21,0.6)]' }
                ];
                
                const style = barStyles[index] || barStyles[barStyles.length - 1];

                return (
                  <div key={lot.lot_number} className="group relative flex flex-col items-center justify-end w-full h-full z-10 cursor-default">
                    
                    {/* Floating Value Tooltip (Appears on hover) */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 z-20 pointer-events-none">
                      <div className="bg-slate-800 text-white text-[10px] font-black px-2.5 py-1.5 rounded-md shadow-lg flex items-center gap-1">
                        {lot.totalFlags} <span className="text-slate-300 font-semibold uppercase tracking-wider text-[8px]">flags</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                      </div>
                    </div>

                    {/* Static value display (Fades out on hover) */}
                    <span className="text-[11px] font-black text-slate-400 mb-2 transition-opacity duration-300 group-hover:opacity-0">
                      {lot.totalFlags}
                    </span>

                    {/* Vertical 3D Bar */}
                    <div className="w-10 sm:w-14 bg-slate-100/80 rounded-t-xl overflow-hidden ring-1 ring-slate-200/50 shadow-inner flex items-end relative transition-transform duration-300 group-hover:scale-x-110" style={{ height: `${percent}%` }}>
                      <div 
                        className={cn(
                          "w-full rounded-t-xl bg-gradient-to-t relative shadow-lg transition-all duration-1000 ease-out group-hover:brightness-110 origin-bottom", 
                          style.bg, 
                          style.shadow,
                          style.glow
                        )}
                        style={{ height: '100%' }}
                      >
                        {/* Vertical Glassmorphism Lighting */}
                        <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-gradient-to-r from-white/30 to-transparent rounded-tl-xl" />
                        <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/40 to-transparent" />
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/60" />
                      </div>
                    </div>

                    {/* Bottom Label & Rank */}
                    <div className="absolute -bottom-12 flex flex-col items-center gap-1.5">
                      {/* Lot Number */}
                      <span className="text-[9px] font-bold text-slate-500 tracking-wide transition-colors duration-300 group-hover:text-slate-900 whitespace-nowrap leading-none mt-1">
                        {lot.lot_number}
                      </span>
                      {/* Rank Badge */}
                      <span className={cn(
                        "flex items-center justify-center min-w-[24px] px-1.5 h-5 rounded-full text-[9px] font-black text-white shadow-sm ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-110",
                        isJaguar ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/40" : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/40"
                      )}>
                        {index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`}
                      </span>
                    </div>
                  </div>
                )
                })
              })()}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
