'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type ChartType = 'lot-comparison' | 'daily-trend' | 'vendor-performance' | 'status-distribution' | 'lot-progress'

interface PerformanceTrendProps {
  dateRange: string
  setDateRange: (value: string) => void
}

export function PerformanceTrend({ dateRange, setDateRange }: PerformanceTrendProps) {
  const [chartType, setChartType] = useState<ChartType>('lot-comparison')
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchChartData()
  }, [chartType])

  const fetchChartData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/chart-data?type=${chartType}`)
      const data = await response.json()
      setChartData(data.chartData || [])
    } catch (error) {
      console.error('Error fetching chart data:', error)
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[350px]">
          <p className="text-muted-foreground">Loading chart data...</p>
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[350px]">
          <p className="text-muted-foreground">No data available</p>
        </div>
      )
    }

    const commonProps = {
      margin: { top: 20, right: 30, left: 0, bottom: 5 }
    }

    switch (chartType) {
      case 'lot-comparison':
        return (
          <BarChart data={chartData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="lot" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: `1px solid var(--color-border)`,
              }}
              cursor={{ fill: 'rgba(85, 153, 255, 0.1)' }}
            />
            <Legend />
            <Bar dataKey="transmitted" fill="#22c55e" name="Transmitted" />
            <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
          </BarChart>
        )

      case 'daily-trend':
        return (
          <LineChart data={chartData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: `1px solid var(--color-border)`,
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="transmitted" stroke="#22c55e" strokeWidth={2} name="Transmitted" />
            <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total Books" />
          </LineChart>
        )

      case 'vendor-performance':
        return (
          <BarChart data={chartData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="vendor" stroke="var(--color-muted-foreground)" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: `1px solid var(--color-border)`,
              }}
              cursor={{ fill: 'rgba(85, 153, 255, 0.1)' }}
            />
            <Legend />
            <Bar dataKey="completionRate" fill="#3b82f6" name="Completion Rate (%)" />
          </BarChart>
        )

      case 'status-distribution':
        return (
          <BarChart data={chartData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="status" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: `1px solid var(--color-border)`,
              }}
              cursor={{ fill: 'rgba(85, 153, 255, 0.1)' }}
            />
            <Legend />
            <Bar dataKey="count" fill="#8b5cf6" name="Book Count" />
          </BarChart>
        )

      case 'lot-progress':
        return (
          <LineChart data={chartData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="lot" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: `1px solid var(--color-border)`,
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="completionRate" stroke="#22c55e" strokeWidth={2} name="Completion Rate (%)" />
          </LineChart>
        )

      default:
        return (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-muted-foreground">Invalid chart type</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Performance Analytics
        </h2>
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as ChartType)}
          className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-card transition-colors"
        >
          <option value="lot-comparison">📊 Lot Comparison</option>
          <option value="daily-trend">📈 Daily Transmission Trend</option>
          <option value="vendor-performance">🏢 Vendor Performance</option>
          <option value="status-distribution">📋 Status Distribution</option>
          <option value="lot-progress">📉 Lot Progress Tracking</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <ResponsiveContainer width="100%" height={350}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
