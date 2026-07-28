import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { authFetch, getApiBaseUrl } from '@/lib/auth-api'
import { LotStatusRow } from '../types/reports.types'

interface QCFlag {
  scan_id: number
  isbn: string | null
  title: string | null
  issue: string | null
  remarks?: string | null
  flagged_at?: string | null
  flagged_by_name?: string | null
  assigned_box?: {
    box_number: string
    box_type?: string | null
    lot?: { lot_number: string } | null
  } | null
}

interface QcFlagsResponse {
  success: boolean
  flags?: QCFlag[]
  total?: number
  error?: string
}

const MISMATCH_ISSUES = new Set([
  'missing',
  'extra',
  'mismatched-book',
  'extra-book',
  'mismatch',
  'inventory mismatch',
  'missing book',
  'extra book',
])

const MISSING_ISSUES = new Set(['missing', 'missing book', 'missing-pages'])

const HOLD_VOLUME_ISSUES = new Set(['hold', 'volume', 'hold-volume', 'held'])

async function fetchQcFlags(brand: string): Promise<QCFlag[]> {
  try {
    const res = await authFetch(
      `${getApiBaseUrl()}/api/dashboard/qc-flags?page=1&limit=1000&box_type=${encodeURIComponent(brand)}`
    )
    const data = (await res.json()) as QcFlagsResponse
    if (!res.ok) throw new Error(data.error || 'Failed to fetch QC flags')
    return (data.flags || []).filter(f => f.issue?.toLowerCase().trim() !== 'other')
  } catch (e) {
    console.error('Failed to fetch QC flags for export:', e)
    return []
  }
}

function countIssueTypes(flags: QCFlag[], lotNumber: string): {
  mismatch: number
  missing: number
  holdVolume: number
} {
  const lotFlags = flags.filter(f => f.assigned_box?.lot?.lot_number === lotNumber)
  let mismatch = 0
  let missing = 0
  let holdVolume = 0

  for (const flag of lotFlags) {
    const issue = (flag.issue || '').toLowerCase().trim()
    if (MISMATCH_ISSUES.has(issue)) mismatch++
    if (MISSING_ISSUES.has(issue)) missing++
    if (HOLD_VOLUME_ISSUES.has(issue)) holdVolume++
  }

  return { mismatch, missing, holdVolume }
}

function computeBoxStageTotals(lot: LotStatusRow) {
  const boxes = lot.boxes || []
  let forInventory = 0
  let forScan = 0
  let doneScan = 0
  let totalTransmission = 0
  let totalReceived = 0

  for (const box of boxes) {
    totalReceived += box.total_books || 0
    totalTransmission += box.transmitted_books || 0
    forScan += box.pending_books || 0
    doneScan += box.wip_books || 0

    if (box.current_stage === 'warehouse') {
      forInventory += box.total_books || 0
    }
  }

  return { forInventory, forScan, doneScan, totalTransmission, totalReceived }
}

function formatReceivedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd')
  } catch {
    return '-'
  }
}

export async function exportReportsToExcel(lots: LotStatusRow[], brand: string) {
  const qcFlags = await fetchQcFlags(brand)

  const lotMismatchRows: (string | number)[][] = [
    ['Received Date', 'Lot #', 'Reported', 'Mismatch Books', 'Mismatch Done'],
  ]
  const inventoryScanRows: (string | number)[][] = [
    ['Lot #', 'Missing Books', 'Hold - Volume Books', 'For inventory', 'For scan', 'Done scan'],
  ]
  const transmissionRows: (string | number)[][] = [
    ['Lot #', 'Total Transmission', 'Total received'],
  ]

  let totalReported = 0
  let totalMismatch = 0
  let totalMissing = 0
  let totalHoldVolume = 0
  let totalForInventory = 0
  let totalForScan = 0
  let totalDoneScan = 0
  let totalTransmission = 0
  let totalReceived = 0

  for (const lot of lots) {
    const { mismatch, missing, holdVolume } = countIssueTypes(qcFlags, lot.lot_number)
    const boxTotals = computeBoxStageTotals(lot)

    lotMismatchRows.push([
      formatReceivedDate(lot.created_at),
      lot.lot_number,
      lot.non_processable || 0,
      mismatch,
      0, // Resolved mismatch flags are removed from the DB; not available historically
    ])

    inventoryScanRows.push([
      lot.lot_number,
      missing,
      holdVolume,
      boxTotals.forInventory,
      boxTotals.forScan,
      boxTotals.doneScan,
    ])

    transmissionRows.push([
      lot.lot_number,
      boxTotals.totalTransmission,
      boxTotals.totalReceived,
    ])

    totalReported += lot.non_processable || 0
    totalMismatch += mismatch
    totalMissing += missing
    totalHoldVolume += holdVolume
    totalForInventory += boxTotals.forInventory
    totalForScan += boxTotals.forScan
    totalDoneScan += boxTotals.doneScan
    totalTransmission += boxTotals.totalTransmission
    totalReceived += boxTotals.totalReceived
  }

  // Add a totals row to the transmission summary table.
  transmissionRows.push(['TOTAL', totalTransmission, totalReceived])

  // Add a totals row to the mismatch report table.
  lotMismatchRows.push(['', 'TOTAL', totalReported, totalMismatch, 0])

  // Add a totals row to the inventory/scan table.
  inventoryScanRows.push(['TOTAL', totalMissing, totalHoldVolume, totalForInventory, totalForScan, totalDoneScan])

  // Combine all three tables into a single sheet with blank rows between them.
  const sheetData: (string | number)[][] = [
    ...lotMismatchRows,
    [],
    [],
    ...inventoryScanRows,
    [],
    [],
    ...transmissionRows,
  ]

  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(sheetData)
  XLSX.utils.book_append_sheet(workbook, sheet, 'Lot Status Report')

  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm')
  XLSX.writeFile(workbook, `lot-status-report-${brand}-${timestamp}.xlsx`)
}
