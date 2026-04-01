import { createClient } from '@supabase/supabase-js'
import { ilmsApi } from '../services/ilms-api.js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkILMSMatches() {
  console.log('🔍 Checking which books from your database exist in client\'s iLMS system...\n')

  // Get sample ISBNs from your database
  const { data: books, error } = await supabase
    .from('imported_books_staging')
    .select('isbn, title')
    .not('isbn', 'is', null)
    .limit(100) // Test first 100 books

  if (error) {
    console.error('Error fetching books:', error)
    return
  }

  console.log(`📚 Testing ${books.length} ISBNs from your database...\n`)

  let found = 0
  let notFound = 0
  const matches = []

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    
    // Search in iLMS API
    const result = await ilmsApi.searchBookByISBN(book.isbn)
    
    if (result.success && result.data && !result.data.Message) {
      found++
      matches.push({
        isbn: book.isbn,
        yourTitle: book.title,
        ilmsData: result.data
      })
      console.log(`✅ MATCH: ${book.isbn} - ${book.title?.substring(0, 50)}`)
    } else {
      notFound++
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${books.length} checked...`)
    }

    // Rate limiting - wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n📊 RESULTS:')
  console.log(`✅ Found in iLMS: ${found}`)
  console.log(`❌ Not in iLMS: ${notFound}`)
  console.log(`📈 Match rate: ${((found / books.length) * 100).toFixed(2)}%`)

  if (matches.length > 0) {
    console.log('\n📚 Sample Matches:')
    matches.slice(0, 5).forEach(m => {
      console.log(`\nISBN: ${m.isbn}`)
      console.log(`Your Title: ${m.yourTitle}`)
      console.log(`iLMS Data:`, JSON.stringify(m.ilmsData, null, 2))
    })
  }
}

checkILMSMatches().catch(console.error)
