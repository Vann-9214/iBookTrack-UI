'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { TopBar } from '@/components/top-bar'
import { IntakeSummary } from '@/components/intake-summary'
import { ValidationStatus } from '@/components/validation-status'
import { BatchQueue } from '@/components/batch-queue'
import { AlertBox } from '@/components/alert-box'

export default function IntakePage() {
  const [timestamp, setTimestamp] = useState<string>('')

  useEffect(() => {
    setTimestamp(new Date().toLocaleString())
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 min-h-0 overflow-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Intake & Validation
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor incoming book batches and validation pipeline
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Last Updated: {timestamp || 'Loading...'}
              </p>
            </div>
          </div>

          {/* Alert if any critical issues */}
          <AlertBox />

          {/* Intake Summary Cards */}
          <IntakeSummary />

          {/* Validation Status and Batch Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ValidationStatus />
            <BatchQueue />
          </div>
        </div>
      </main>
    </div>
  )
}
