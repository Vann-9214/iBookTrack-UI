import { format } from 'date-fns'
import * as XLSX from 'xlsx-js-style'
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

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '4472C4' }, patternType: 'solid' as const },
  alignment: { horizontal: 'center' as const, vertical: 'center' as const },
}

const TOTAL_STYLE = {
  font: { bold: true, color: { rgb: '000000' } },
  fill: { fgColor: { rgb: 'FFFF00' }, patternType: 'solid' as const },
  alignment: { horizontal: 'left' as const, vertical: 'center' as const },
}

const BORDER_STYLE = {
  top: { style: 'thin' as const, color: { rgb: '000000' } },
  bottom: { style: 'thin' as const, color: { rgb: '000000' } },
  left: { style: 'thin' as const, color: { rgb: '000000' } },
  right: { style: 'thin' as const, color: { rgb: '000000' } },
}

function applyRowStyle(
  sheet: XLSX.WorkSheet,
  rowIndex: number,
  style: Record<string, unknown>,
  startCol: number,
  endCol: number
) {
  for (let col = startCol; col <= endCol; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: col })
    const cell = sheet[cellRef]
    if (cell) {
      cell.s = style
    }
  }
}

function applyBordersAndCenterNumbers(sheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      const cell = sheet[cellRef]
      if (!cell) continue

      if (!cell.s) cell.s = {}
      cell.s.border = BORDER_STYLE

      // Center-align numeric cells (type 'n').
      if (cell.t === 'n') {
        cell.s.alignment = { ...(cell.s.alignment || {}), horizontal: 'center', vertical: 'center' }
      }
    }
  }
}

export async function exportReportsToExcel(lots: LotStatusRow[], brand: string) {
  const qcFlags = await fetchQcFlags(brand)

  const headers = [
    'Received Date',
    'Lot #',
    'Reported',
    'Mismatch Books',
    'Mismatch Done',
    'Missing Books',
    'Hold - Volume Books',
    'For inventory',
    'For scan',
    'Done scan',
    'Total Transmission',
    'Total received',
  ]

  const rows: (string | number)[][] = [headers]

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

    rows.push([
      formatReceivedDate(lot.created_at),
      lot.lot_number,
      lot.non_processable || 0,
      mismatch,
      0, // Resolved mismatch flags are removed from the DB; not available historically
      missing,
      holdVolume,
      boxTotals.forInventory,
      boxTotals.forScan,
      boxTotals.doneScan,
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

  // Total row is always the last row.
  rows.push([
    'TOTAL',
    '',
    totalReported,
    totalMismatch,
    0,
    totalMissing,
    totalHoldVolume,
    totalForInventory,
    totalForScan,
    totalDoneScan,
    totalTransmission,
    totalReceived,
  ])

  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(rows)

  const headerCols = headers.length - 1
  const lastRow = rows.length - 1

  applyRowStyle(sheet, 0, HEADER_STYLE, 0, headerCols)
  applyRowStyle(sheet, lastRow, TOTAL_STYLE, 0, headerCols)
  applyBordersAndCenterNumbers(sheet)

  // Auto-width columns for readability.
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }))
  sheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, sheet, 'Lot Status Report')

  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm')
  XLSX.writeFile(workbook, `lot-status-report-${brand}-${timestamp}.xlsx`)
}
