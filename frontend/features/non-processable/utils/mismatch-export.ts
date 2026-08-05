import { format } from 'date-fns'
import * as XLSX from 'xlsx-js-style'
import { authFetch, getApiBaseUrl } from '@/lib/auth-api'

export interface MismatchExportRow {
  isbn: string
  lot: string
  box: string
  ilms_title: string
  ilms_author: string
  physical_title: string
  physical_author: string
  project_type: string
  date: string
}

interface MismatchExportResponse {
  success: boolean
  rows?: MismatchExportRow[]
  error?: string
}

export async function fetchMismatchExport(date: string, brand: string): Promise<MismatchExportRow[]> {
  const res = await authFetch(
    `${getApiBaseUrl()}/api/dashboard/qc-flags/export/mismatch?date=${encodeURIComponent(date)}&box_type=${encodeURIComponent(brand)}`
  )
  const data = (await res.json()) as MismatchExportResponse
  if (!res.ok) throw new Error(data.error || 'Failed to fetch mismatch export')
  return data.rows || []
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

      if (cell.t === 'n') {
        cell.s.alignment = { ...(cell.s.alignment || {}), horizontal: 'center', vertical: 'center' }
      }
    }
  }
}

export async function exportMismatchToExcel(rows: MismatchExportRow[], brand: string) {
  const headers = [
    'ISBN',
    'Lot',
    'Box',
    'Title in ILMS',
    'Author in ILMS',
    'Physical Book Title',
    'Physical Author',
    'Project Type',
    'Date',
  ]

  const dataRows = rows.map((r) => [
    r.isbn,
    r.lot,
    r.box,
    r.ilms_title,
    r.ilms_author,
    r.physical_title,
    r.physical_author,
    r.project_type,
    r.date,
  ])

  const totalRow = ['TOTAL', rows.length, '', '', '', '', '', '', '']
  const sheetRows: (string | number)[][] = [headers, ...dataRows, totalRow]

  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(sheetRows)

  const headerCols = headers.length - 1
  const lastRow = sheetRows.length - 1

  applyRowStyle(sheet, 0, HEADER_STYLE, 0, headerCols)
  applyRowStyle(sheet, lastRow, TOTAL_STYLE, 0, headerCols)
  applyBordersAndCenterNumbers(sheet)

  const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }))
  sheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, sheet, 'Mismatched Books')

  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm')
  XLSX.writeFile(workbook, `mismatched-books-${brand}-${timestamp}.xlsx`)
}
