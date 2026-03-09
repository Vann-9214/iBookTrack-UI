'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { FileImport } from '@/components/file-import'
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
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
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
              {showImport ? 'Close' : 'Import Data'}
            </button>
          </div>

          {/* Import Section */}
          {showImport && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Import Delivery Data
              </h2>
              <FileImport onDataImport={handleDataImport} />
              {importedData && (
                <div className="mt-4 p-3 bg-success/10 border border-success rounded-lg">
                  <p className="text-sm text-success font-medium">
                    ✓ Data imported successfully! Dashboard will refresh with your data.
                  </p>
                </div>
              )}
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
    </div>
  )
}
