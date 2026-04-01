import { ilmsApi } from '../services/ilms-api.js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

async function exploreILMSCatalog() {
  console.log('🔍 Exploring client\'s iLMS catalog...\n')

  // Try searching with common terms
  const searchTerms = [
    'Engineering',
    'Science',
    'Mathematics',
    'Computer',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'History',
    'Business'
  ]

  console.log('📚 Searching by common subjects...\n')

  for (const term of searchTerms) {
    console.log(`\n🔎 Searching for: "${term}"`)
    
    const result = await ilmsApi.searchBookByTitle(term)
    
    if (result.success && result.data) {
      if (Array.isArray(result.data)) {
        console.log(`   ✅ Found ${result.data.length} books`)
        if (result.data.length > 0) {
          console.log('   Sample books:')
          result.data.slice(0, 3).forEach(book => {
            console.log(`      - ISBN: ${book.ISBN || 'N/A'}`)
            console.log(`        Title: ${book.Title?.substring(0, 60) || 'N/A'}`)
          })
        }
      } else if (result.data.Message) {
        console.log(`   ℹ️  ${result.data.Message}`)
      } else {
        console.log(`   ✅ Found data:`, JSON.stringify(result.data, null, 2).substring(0, 200))
      }
    } else {
      console.log(`   ❌ No results`)
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n\n📊 Exploration complete!')
  console.log('💡 Tip: If you found books, note their ISBNs and use them for testing')
}

exploreILMSCatalog().catch(console.error)
