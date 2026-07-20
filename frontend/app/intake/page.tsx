'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { IntakeSummary } from '@/components/intake-summary'
import { ValidationStatus } from '@/components/validation-status'
import { BatchQueue } from '@/components/batch-queue'
import { AlertBox } from '@/components/alert-box'
import { DashboardNavbar } from '@/components/top-bar'
import { PageHeader } from '@/components/page-header'
import { Inbox } from 'lucide-react'
import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'

export default function IntakePage() {
  const { brand } = useBrand()
  const [timestamp, setTimestamp] = useState<string>('')

  useEffect(() => {
    setTimestamp(new Date().toLocaleString())
  }, [])

  return (
    <div className={cn("flex h-dvh overflow-hidden bg-background", `theme-${brand}`)}>
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="ambient-bg flex-1 min-h-0 overflow-auto flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
          {/* Header */}
          <PageHeader
            title="Intake & Validation"
            subtitle="Monitor incoming book batches and validation pipeline"
            icon={Inbox}
            rightContent={
              <p className="text-xs text-muted-foreground">
                Last Updated: {timestamp || 'Loading...'}
              </p>
            }
          />

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
