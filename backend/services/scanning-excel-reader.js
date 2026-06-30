/**
 * services/scanning-excel-reader.js
 *
 * Legacy fallback service that reads scanning data directly from a local
 * Excel file (DashboardLatest.xlsx) produced by the scanning tool.
 *
 * This was used before the Simflex REST API integration was available.
 * It is still kept as a fallback in case the API is unreachable.
 *
 * Required environment variable:
 *   SCANNING_EXCEL_PATH — Absolute path to the DashboardLatest.xlsx file.
 *                         Example (Windows):
 *                           SCANNING_EXCEL_PATH=C:/Users/YourName/Downloads/book_scanning_dashboard_Scan Manager/DashboardLatest.xlsx
 */

import XLSX from 'xlsx'
import fs from 'fs'

// ── File path — read from .env ────────────────────────────────────────────────
// Never hardcode a machine-specific path here. Set SCANNING_EXCEL_PATH in .env.
const EXCEL_FILE_PATH = process.env.SCANNING_EXCEL_PATH

if (!EXCEL_FILE_PATH) {
  console.warn('⚠️  SCANNING_EXCEL_PATH is not set in .env — Excel-based scanning data will be unavailable.')
}

// ── readScanningExcel ─────────────────────────────────────────────────────────
/**
 * Read and parse all sheets from the scanning dashboard Excel file.
 * Returns a map of { sheetName: [rows] } along with the file's last-modified time.
 *
 * @returns {{ success: boolean, data?: object, sheetNames?: string[], lastModified?: Date, error?: string }}
 */
export async function readScanningExcel() {
  try {
    // Guard: env var not configured
    if (!EXCEL_FILE_PATH) {
      return {
        success: false,
        error: 'SCANNING_EXCEL_PATH is not set in .env'
      }
    }

    // Guard: file does not exist at the configured path
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.log('⚠️  Excel file not found at:', EXCEL_FILE_PATH)
      return {
        success: false,
        error: `Excel file not found at: ${EXCEL_FILE_PATH}`
      }
    }

    // Read and parse the workbook
    const workbook = XLSX.readFile(EXCEL_FILE_PATH)
    const sheetNames = workbook.SheetNames
    console.log('📊 Found sheets:', sheetNames)

    // Convert every sheet to an array of row objects
    const data = {}
    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      data[sheetName] = XLSX.utils.sheet_to_json(worksheet)
    })

    return {
      success: true,
      data,
      sheetNames,
      lastModified: fs.statSync(EXCEL_FILE_PATH).mtime
    }
  } catch (error) {
    console.error('Error reading Excel file:', error)
    return { success: false, error: error.message }
  }
}

// ── getTodayScanningSummaryFromExcel ──────────────────────────────────────────
/**
 * Derive today's scan summary (total / completed / failed / ongoing) from the
 * first sheet of the Excel file.
 *
 * The sheet is expected to have a 'Status' column whose values follow the same
 * conventions as Simflex (e.g. 'COMPLETED', 'Preval COMPLETED', 'FAILED', etc.).
 *
 * @returns {{ success: boolean, data?: { TotalScans, Completed, Failed, Ongoing }, lastUpdated?: Date, error?: string }}
 */
export async function getTodayScanningSummaryFromExcel() {
  try {
    const result = await readScanningExcel()
    if (!result.success) return result

    // Use the first sheet as the summary sheet
    const summarySheet = result.data[result.sheetNames[0]]

    let totalScans = 0
    let completed  = 0
    let failed     = 0
    let ongoing    = 0

    if (Array.isArray(summarySheet)) {
      summarySheet.forEach(row => {
        totalScans++
        if (row.Status === 'COMPLETED' || row.Status === 'Preval COMPLETED') {
          completed++
        } else if (row.Status === 'FAILED' || row.Status?.includes('FAILED')) {
          failed++
        } else if (row.Status === 'Ongoing' || row.Status?.includes('Ongoing')) {
          ongoing++
        }
      })
    }

    return {
      success: true,
      data: { TotalScans: totalScans, Completed: completed, Failed: failed, Ongoing: ongoing },
      lastUpdated: result.lastModified
    }
  } catch (error) {
    console.error('Error getting summary from Excel:', error)
    return { success: false, error: error.message }
  }
}

// ── getScanningByMachineFromExcel ─────────────────────────────────────────────
/**
 * Group scan rows from the Excel file by scanner machine name, counting
 * total / completed / failed scans per machine.
 *
 * Expects columns: MachineName (or Machine), Status.
 *
 * @returns {{ success: boolean, data?: Array, lastUpdated?: Date, error?: string }}
 */
export async function getScanningByMachineFromExcel() {
  try {
    const result = await readScanningExcel()
    if (!result.success) return result

    const data = result.data[result.sheetNames[0]]
    const byMachine = {}

    if (Array.isArray(data)) {
      data.forEach(row => {
        const machine = row.MachineName || row.Machine || 'Unknown'
        if (!byMachine[machine]) {
          byMachine[machine] = { MachineName: machine, TotalScans: 0, Completed: 0, Failed: 0 }
        }
        byMachine[machine].TotalScans++
        if (row.Status === 'COMPLETED' || row.Status === 'Preval COMPLETED') {
          byMachine[machine].Completed++
        } else if (row.Status === 'FAILED' || row.Status?.includes('FAILED')) {
          byMachine[machine].Failed++
        }
      })
    }

    return {
      success: true,
      data: Object.values(byMachine),
      lastUpdated: result.lastModified
    }
  } catch (error) {
    console.error('Error getting machine stats from Excel:', error)
    return { success: false, error: error.message }
  }
}

// ── getAllScanningDataFromExcel ────────────────────────────────────────────────
/**
 * Return all rows from the first sheet of the Excel file as-is.
 * Useful for debugging or full exports when Simflex is unavailable.
 *
 * @returns {{ success: boolean, data?: Array, lastUpdated?: Date, error?: string }}
 */
export async function getAllScanningDataFromExcel() {
  try {
    const result = await readScanningExcel()
    if (!result.success) return result

    return {
      success: true,
      data: result.data[result.sheetNames[0]],
      lastUpdated: result.lastModified
    }
  } catch (error) {
    console.error('Error getting all data from Excel:', error)
    return { success: false, error: error.message }
  }
}

export default {
  readScanningExcel,
  getTodayScanningSummaryFromExcel,
  getScanningByMachineFromExcel,
  getAllScanningDataFromExcel
}
