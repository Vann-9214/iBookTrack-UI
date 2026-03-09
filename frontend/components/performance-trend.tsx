'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const trendData = [
  {
    date: 'Yesterday',
    transmitted: 3200,
    wip: 1800,
    reject: 120,
  },
  {
    date: 'Today',
    transmitted: 3850,
    wip: 1500,
    reject: 95,
  },
  {
    date: 'This Week',
    transmitted: 22500,
    wip: 8200,
    reject: 620,
  },
]

interface PerformanceTrendProps {
  dateRange: string
  setDateRange: (value: string) => void
}

export function PerformanceTrend({ dateRange, setDateRange }: PerformanceTrendProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Performance Trend
        </h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-card transition-colors"
        >
          <option value="yesterday">Yesterday</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: `1px solid var(--color-border)`,
              }}
              cursor={{ fill: 'rgba(85, 153, 255, 0.1)' }}
            />
            <Legend />
            <Bar dataKey="transmitted" fill="var(--color-success)" name="Transmitted" />
            <Bar dataKey="wip" fill="var(--color-warning)" name="Work in Progress" />
            <Bar dataKey="reject" fill="var(--color-destructive)" name="Reject" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
