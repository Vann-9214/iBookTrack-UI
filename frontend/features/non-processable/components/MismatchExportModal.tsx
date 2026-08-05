'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { fetchMismatchExport, exportMismatchToExcel } from '../utils/mismatch-export'

interface MismatchExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand: string
}

export function MismatchExportModal({ open, onOpenChange, brand }: MismatchExportModalProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const rows = await fetchMismatchExport(dateStr, brand)
      if (rows.length === 0) {
        setError('No mismatched books found for the selected date.')
        setLoading(false)
        return
      }
      await exportMismatchToExcel(rows, brand)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Mismatched Books</DialogTitle>
          <DialogDescription>
            Choose a date to export all mismatched books flagged on that day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            initialFocus
            className={cn(
              'rounded-xl border shadow-sm',
              brand === 'jaguar' ? 'border-emerald-200' : 'border-blue-200'
            )}
          />
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading}
            className={cn(
              'gap-2',
              brand === 'jaguar'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? 'Exporting...' : 'Export Excel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
