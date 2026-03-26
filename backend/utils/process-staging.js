import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Found' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Process staging data into main tables
 * - Creates lots if they don't exist
 * - Creates/updates books
 * - Links books to boxes
 */
async function processStagingData() {
  console.log('🔄 Processing staging data...\n')

  // Get unprocessed rows
  const { data: stagingRows, error } = await supabase
    .from('imported_books_staging')
    .select('*')
    .eq('processed', false)
    .limit(1000) // Process 1000 at a time

  if (error) {
    console.error('❌ Error fetching staging data:', error)
    return
  }

  if (!stagingRows || stagingRows.length === 0) {
    console.log('✅ No unprocessed rows found!')
    return
  }

  console.log(`📦 Processing ${stagingRows.length} rows...\n`)

  let processed = 0
  let errors = 0

  for (const row of stagingRows) {
    try {
      // 1. Get or create lot
      let lot = null
      if (row.lot_no) {
        const { data: existingLot } = await supabase
          .from('lots')
          .select('id')
          .eq('lot_number', row.lot_no)
          .single()

        if (existingLot) {
          lot = existingLot
        } else {
          // Create new lot
          const { data: newLot, error: lotError } = await supabase
            .from('lots')
            .insert({
              lot_number: row.lot_no,
              total_boxes: 0,
              status: 'intake'
            })
            .select()
            .single()

          if (lotError) throw lotError
          lot = newLot
        }
      }

      // 2. Create or update book
      if (row.isbn) {
        const bookData = {
          isbn: row.isbn,
          title: row.title || `ISBN: ${row.isbn}`,
          language: row.language || 'Unknown',
          current_stage: 'inspection',
          lot_id: lot?.id || null
        }

        // Check if book exists
        const { data: existingBook } = await supabase
          .from('books')
          .select('id')
          .eq('isbn', row.isbn)
          .single()

        if (existingBook) {
          // Update existing book
          await supabase
            .from('books')
            .update(bookData)
            .eq('id', existingBook.id)
        } else {
          // Insert new book
          await supabase
            .from('books')
            .insert(bookData)
        }
      }

      // 3. Mark as processed
      await supabase
        .from('imported_books_staging')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', row.id)

      processed++
      if (processed % 100 === 0) {
        console.log(`✅ Processed ${processed}/${stagingRows.length} rows...`)
      }

    } catch (err) {
      errors++
      console.error(`❌ Error processing row ${row.id}:`, err.message)
      
      // Mark with error
      await supabase
        .from('imported_books_staging')
        .update({
          processing_error: err.message
        })
        .eq('id', row.id)
    }
  }

  console.log('\n📊 Processing Summary:')
  console.log(`✅ Successfully processed: ${processed}`)
  console.log(`❌ Errors: ${errors}`)
}

processStagingData()
  .then(() => {
    console.log('\n✅ Processing completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Processing failed:', error)
    process.exit(1)
  })
