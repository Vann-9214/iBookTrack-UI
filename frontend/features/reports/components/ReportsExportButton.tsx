import React, { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LotStatusRow } from '../types/reports.types'

interface ReportsExportButtonProps {
  brand: string
  lots: LotStatusRow[]
  disabled?: boolean
}

export const ReportsExportButton: React.FC<ReportsExportButtonProps> = ({
  brand,
  lots,
  disabled = false,
}) => {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (lots.length === 0 || exporting) return
    setExporting(true)
    try {
      const { exportReportsToExcel } = await import('../utils/reports-export')
      await exportReportsToExcel(lots, brand)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || lots.length === 0 || exporting}
      className="gap-1.5 h-8"
    >
      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      <span>{exporting ? 'Exporting…' : 'Export'}</span>
    </Button>
  )
}
