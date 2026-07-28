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
      <div className={cn("rounded-2xl border p-5 shadow-sm ring-1 flex flex-col h-96 transition-colors duration-300 lg:col-span-2 bg-white", dynamicTone.card)}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold tracking-tight text-gray-800 flex items-center gap-2 mb-1">
              Timeline
            </h3>
            <p className="text-xs text-gray-500">Non-processable items flagged over time</p>
          </div>
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-white shadow-sm", isJaguar ? "text-emerald-700 ring-1 ring-emerald-200/50" : "text-blue-700 ring-1 ring-blue-200/50")}>
            <TrendingUp className="h-3.5 w-3.5" />
            Selected Period
          </div>
        </div>
        
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFlags" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isJaguar ? '#10b981' : '#3b82f6'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isJaguar ? '#10b981' : '#3b82f6'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
                allowDecimals={false}
              />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                labelStyle={{ color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}
                cursor={{ stroke: isJaguar ? '#10b981' : '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area 
                type="monotone" 
                dataKey="flags" 
                stroke={isJaguar ? '#10b981' : '#3b82f6'} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFlags)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: isJaguar ? '#10b981' : '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Worst Lots Graph */}
      <div className={cn("rounded-2xl border p-5 shadow-sm ring-1 flex flex-col h-96 transition-colors duration-300 lg:col-span-1 bg-white", dynamicTone.card)}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold tracking-tight text-gray-800 flex items-center gap-2 mb-1">
              Worst Lots
            </h3>
            <p className="text-xs text-gray-500">Top 5 by flag count</p>
          </div>
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-white shadow-sm", "text-red-700 ring-1 ring-red-200/50")}>
            Top 5
          </div>
        </div>
        
        <div className="flex-1 w-full min-h-0 relative">
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
            <div className="w-full h-full -ml-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={structuredLots.slice(0, 5).map(l => ({ name: l.lot_number, flags: l.totalFlags }))} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} width={90} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                    labelStyle={{ color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}
                    cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                  />
                  <Bar dataKey="flags" radius={[0, 4, 4, 0]} barSize={24}>
                    {
                      structuredLots.slice(0, 5).map((entry, index) => {
                        const heatGradient = ['#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444'];
                        return <Cell key={`cell-${index}`} fill={heatGradient[index] || '#f87171'} />
                      })
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
