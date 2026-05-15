import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

// Path to the scanning tool's Excel file
// UPDATE THIS PATH to where the DashboardLatest.xlsx file is located
const EXCEL_FILE_PATH = 'C:/Users/MUSTANG-OJT/Downloads/book_scanning_dashboard_Scan Manager/DashboardLatest.xlsx'

/**
 * Read the scanning dashboard Excel file
 */
export async function readScanningExcel() {
  try {
    // Check if file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.log('⚠️  Excel file not found at:', EXCEL_FILE_PATH)
      return {
        success: false,
        error: 'Excel file not found. Please update the path in scanning-excel-reader.js'
      }
    }

    // Read the Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH)
    
    // Get all sheet names
    const sheetNames = workbook.SheetNames
    console.log('📊 Found sheets:', sheetNames)
    
    // Read all sheets
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
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get today's scanning summary from Excel
 */
export async function getTodayScanningSummaryFromExcel() {
  try {
    const result = await readScanningExcel()
    
    if (!result.success) {
      return result
    }
    
    // Find the summary sheet (might be named "Summary", "Dashboard", etc.)
    const summarySheet = result.data[result.sheetNames[0]] // First sheet
    
    // Parse the data to get totals
    // This structure depends on how the Excel is formatted
    // You may need to adjust this based on the actual Excel structure
    
    let totalScans = 0
    let completed = 0
    let failed = 0
    let ongoing = 0
    
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
      data: {
        TotalScans: totalScans,
        Completed: completed,
        Failed: failed,
        Ongoing: ongoing
      },
      lastUpdated: result.lastModified
    }
  } catch (error) {
    console.error('Error getting summary from Excel:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get scanning data by machine from Excel
 */
export async function getScanningByMachineFromExcel() {
  try {
    const result = await readScanningExcel()
    
    if (!result.success) {
      return result
    }
    
    const data = result.data[result.sheetNames[0]]
    
    // Group by machine name
    const byMachine = {}
    
    if (Array.isArray(data)) {
      data.forEach(row => {
        const machine = row.MachineName || row.Machine || 'Unknown'
        
        if (!byMachine[machine]) {
          byMachine[machine] = {
            MachineName: machine,
            TotalScans: 0,
            Completed: 0,
            Failed: 0
          }
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
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get all scanning data from Excel
 */
export async function getAllScanningDataFromExcel() {
  try {
    const result = await readScanningExcel()
    
    if (!result.success) {
      return result
    }
    
    return {
      success: true,
      data: result.data[result.sheetNames[0]], // Return first sheet data
      lastUpdated: result.lastModified
    }
  } catch (error) {
    console.error('Error getting all data from Excel:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export default {
  readScanningExcel,
  getTodayScanningSummaryFromExcel,
  getScanningByMachineFromExcel,
  getAllScanningDataFromExcel
}
