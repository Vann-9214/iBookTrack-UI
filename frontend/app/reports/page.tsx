'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { TopBar } from '@/components/top-bar'
import { ImportModal } from '@/components/import-modal'
import { MetricsRow } from '@/components/metrics-row'
import { CategoryBreakdown } from '@/components/category-breakdown'
import { PerformanceTrend } from '@/components/performance-trend'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('today')
  const [timestamp, setTimestamp] = useState<string>('')
  const [showImport, setShowImport] = useState(false)
  const [importedData, setImportedData] = useState<any>(null)

  useEffect(() => {
    setTimestamp(new Date().toLocaleString())
  }, [])

  const handleDataImport = (data: any) => {
    setImportedData(data)
    console.log('Data imported successfully:', data)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8">
          {/* Header */}
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Mustang & Jaguar Workload Status
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Last Updated: {timestamp || 'Loading...'}
              </p>
            </div>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Import Data
            </button>
          </header>

          {importedData && (
            <div className="bg-success/10 border border-success rounded-lg p-4">
              <p className="text-sm text-success font-medium">
                ✓ Data imported successfully! Dashboard will refresh with your data.
              </p>
            </div>
          )}

          {/* Key Metrics */}
          <MetricsRow />

          {/* Category Breakdown */}
          <CategoryBreakdown />

          {/* Performance Trend */}
          <PerformanceTrend dateRange={dateRange} setDateRange={setDateRange} />
        </div>
      </main>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onDataImport={handleDataImport}
      />
    </div>
  )
}
