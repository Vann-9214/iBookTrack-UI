import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables
const envPaths = ['../.env', '.env', '../.env.local']
let envLoaded = false

for (const path of envPaths) {
  if (fs.existsSync(path)) {
    dotenv.config({ path })
    envLoaded = true
    console.log(`✅ Loaded environment from: ${path}`)
    break
  }
}

if (!envLoaded) {
  console.error('❌ Could not find .env file')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// CSV parser that handles quoted fields with commas
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Validate row data
function isValidRow(row) {
  // Must have ISBN and lot number
  if (!row[4] || !row[3]) return false
  
  // ISBN should be reasonable length
  if (row[4].length < 10 || row[4].length > 20) return false
  
  // Lot number should match pattern
  if (!row[3].match(/^(Lot-\d{1,2}M?|ISO \d+|\d+)$/i)) return false
  
  return true
}

async function importCSV(csvPath) {
  console.log('📁 Reading CSV file:', csvPath)
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath)
    process.exit(1)
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = fileContent.split('\n')
  
  console.log(`📊 Total lines in CSV: ${lines.length.toLocaleString()}`)
  
  // Skip header row
  const dataLines = lines.slice(1).filter(line => line.trim())
  console.log(`📊 Data rows to process: ${dataLines.length.toLocaleString()}`)

  const BATCH_SIZE = 1000
  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
    const batch = dataLines.slice(i, i + BATCH_SIZE)
    const records = []

    for (const line of batch) {
      const columns = parseCSVLine(line)
      
      // Validate row
      if (!isValidRow(columns)) {
        skipped++
        continue
      }

      // Map columns to database fields (NEW FORMAT - 15 columns)
      const record = {
        s_no: columns[0] ? parseInt(columns[0]) : null,
        vendor_name: columns[1] || null,
        facility_id: columns[2] || null,
        lot_no: columns[3] || null,
        isbn: columns[4] || null,
        title: columns[5] || null,
        received_date: columns[6] || null,
        inventory_check_uid: columns[7] || null,
        scanning_date: columns[8] || null,
        scanning_user_id: columns[9] || null,
        final_status: columns[10] || null,
        trans_date: columns[11] || null,
        language: columns[12] || null,
        language_ilms: columns[13] || null,
        phase: columns[14] || null
      }

      records.push(record)
    }

    if (records.length > 0) {
      const { error } = await supabase
        .from('imported_books_staging')
        .insert(records)

      if (error) {
        console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message)
        errors += records.length
      } else {
        imported += records.length
        const progress = ((i + batch.length) / dataLines.length * 100).toFixed(1)
        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: Imported ${records.length} records (${progress}% complete)`)
      }
    }
  }

  console.log('\n📊 Import Summary:')
  console.log(`✅ Successfully imported: ${imported.toLocaleString()} rows`)
  console.log(`⚠️  Skipped (invalid): ${skipped.toLocaleString()} rows`)
  console.log(`❌ Errors: ${errors.toLocaleString()} rows`)
  console.log(`📈 Total processed: ${(imported + skipped + errors).toLocaleString()} rows`)
}

// Get CSV path from command line argument
const csvPath = process.argv[2]

if (!csvPath) {
  console.error('❌ Please provide CSV file path')
  console.error('Usage: node import-excel-new.js <path-to-csv>')
  process.exit(1)
}

importCSV(csvPath).catch(console.error)
