import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Try loading .env from multiple possible locations
const possiblePaths = [
  join(__dirname, '../../.env'),           // iBookTrack/.env
  join(__dirname, '../../../.env'),        // One level up
  join(process.cwd(), '.env'),             // Current working directory
  join(process.cwd(), '../.env')           // Parent of cwd
]

let envLoaded = false
for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading .env from: ${envPath}`)
    dotenv.config({ path: envPath })
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.log('⚠️  No .env file found, trying default dotenv.config()')
  dotenv.config()
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Checked paths:', possiblePaths)
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Found' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Parse a CSV line properly, handling quoted fields with commas
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Add last field
  result.push(current.trim())
  
  return result
}

/**
 * Import CSV file into staging table
 * Usage: node import-excel.js <path-to-csv-file>
 */
async function importCSV(filePath) {
  console.log('📂 Reading CSV file:', filePath)
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let lineNumber = 0
  let headers = []
  let batch = []
  const BATCH_SIZE = 1000 // Insert 1000 rows at a time
  let totalImported = 0
  let totalErrors = 0

  for await (const line of rl) {
    lineNumber++
    
    // Parse CSV line properly - handles commas inside quoted fields
    const values = parseCSVLine(line)
    
    if (lineNumber === 1) {
      // First line is headers - normalize them for matching
      headers = values.map(h => h.trim().toLowerCase())
      console.log('📋 Found columns:', headers.length)
      console.log('📋 Headers:', headers.join(' | '))
      continue
    }

    // Helper function to get column by exact position (0-indexed)
    const getColByIndex = (idx) => {
      return (values[idx] !== undefined && values[idx] !== '') ? values[idx] : null
    }

    // Map CSV columns by exact position based on your table structure
    // Columns: S.No | Vendor Name | FACILITY_ID | Lot No. | ISBN | Title | Received-Date | Received-Status | Inventory Check | Scan | Scanning-Date | Scanning-User | xx | FINAL STATUS | xx | Sir Dan's Remark | Trans Date | Language | Language Ilms | Phase | VENDOR new | Lot No.
    const row = {
      s_no: parseInt(getColByIndex(0)) || null,           // Column A: S. No
      vendor_name: getColByIndex(1),                      // Column B: Vendor Name
      facility_id: getColByIndex(2),                      // Column C: FACILITY_ID
      lot_no: getColByIndex(3),                           // Column D: Lot No.
      isbn: getColByIndex(4),                             // Column E: ISBN
      title: getColByIndex(5),                            // Column F: Title
      received_date: getColByIndex(6),                    // Column G: Received - Date
      received_status: getColByIndex(7),                  // Column H: Received - Status
      inventory_check_uid: getColByIndex(8),              // Column I: Inventory Check by- UID
      scan_status: getColByIndex(9),                      // Column J: Scan
      scanning_date: getColByIndex(10),                   // Column K: Scanning - Date
      scanning_user_id: getColByIndex(11),                // Column L: Scanning - User ID
      // getColByIndex(12) is Column M: xx (blank)
      final_status: getColByIndex(13),                    // Column N: FINAL STATUS
      // getColByIndex(14) is Column O: xx (blank)
      sir_dans_remark: getColByIndex(15),                 // Column P: Sir Dan's Remark
      trans_date: getColByIndex(16),                      // Column Q: Trans Date
      language: getColByIndex(17),                        // Column R: Language
      language_ilms: getColByIndex(18),                   // Column S: Language Ilms
      phase: getColByIndex(19),                           // Column T: Phase
      vendor_new: getColByIndex(20),                      // Column U: VENDOR new
      lot_no_2: getColByIndex(21)                         // Column V: Lot No. (duplicate)
    }
    
    // Validate row data - skip rows with obvious corruption
    const isValidRow = () => {
      // Check if ISBN looks valid (should be numeric or start with 978/979)
      if (row.isbn && row.isbn.length > 0) {
        const isbnClean = row.isbn.replace(/[^0-9]/g, '')
        if (isbnClean.length < 10 || isbnClean.length > 13) {
          return false // Invalid ISBN length
        }
      }
      
      // Check if lot_no looks valid (should contain "Lot" or be a number)
      if (row.lot_no && row.lot_no.length > 0) {
        if (!row.lot_no.includes('Lot') && !row.lot_no.includes('lot') && !/^\d+$/.test(row.lot_no)) {
          // Lot number doesn't contain "Lot" and isn't a pure number - might be corrupted
          if (row.lot_no.length > 50) {
            return false // Lot number too long - definitely corrupted
          }
        }
      }
      
      // Check if title is in lot_no or isbn (data shifted)
      if (row.lot_no && row.lot_no.length > 30) {
        return false // Lot number too long - likely contains title data
      }
      
      return true
    }

    // Debug: Log suspicious rows
    if (lineNumber <= 10 || !isValidRow()) {
      console.log(`Row ${lineNumber}: Valid=${isValidRow()} ISBN="${row.isbn}" Title="${row.title}" LotNo="${row.lot_no}" Cols=${values.length}`)
    }

    // Only add valid rows to batch
    if (isValidRow()) {
      batch.push(row)
    } else {
      totalErrors++
      console.warn(`⚠️  Skipping corrupted row ${lineNumber} (s_no: ${row.s_no})`)
    }

    // Insert batch when it reaches BATCH_SIZE
    if (batch.length >= BATCH_SIZE) {
      const { error } = await supabase
        .from('imported_books_staging')
        .insert(batch)
      
      if (error) {
        console.error(`❌ Error inserting batch at line ${lineNumber}:`, error.message)
        totalErrors += batch.length
      } else {
        totalImported += batch.length
        console.log(`✅ Imported ${totalImported} rows...`)
      }
      
      batch = []
    }
  }

  // Insert remaining rows
  if (batch.length > 0) {
    const { error } = await supabase
      .from('imported_books_staging')
      .insert(batch)
    
    if (error) {
      console.error('❌ Error inserting final batch:', error.message)
      totalErrors += batch.length
    } else {
      totalImported += batch.length
    }
  }

  console.log('\n📊 Import Summary:')
  console.log(`✅ Successfully imported: ${totalImported} rows`)
  console.log(`❌ Errors: ${totalErrors} rows`)
  console.log(`📝 Total processed: ${lineNumber - 1} rows`)
}

// Get CSV file path from command line
const csvFilePath = process.argv[2]

if (!csvFilePath) {
  console.error('❌ Usage: node import-excel.js <path-to-csv-file>')
  console.error('Example: node import-excel.js ../data/mustang-books.csv')
  process.exit(1)
}

importCSV(csvFilePath)
  .then(() => {
    console.log('✅ Import completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Import failed:', error)
    process.exit(1)
  })
