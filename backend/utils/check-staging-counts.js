import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCounts() {
  console.log('📊 Checking staging table counts...\n')

  // Total count
  const { count: total } = await supabase
    .from('imported_books_staging')
    .select('*', { count: 'exact', head: true })

  console.log('✅ Total rows in staging table:', total?.toLocaleString())

  // Get sample of final_status values
  const { data: sample } = await supabase
    .from('imported_books_staging')
    .select('final_status')
    .limit(1000)

  const statusCounts = {}
  sample?.forEach(row => {
    const status = row.final_status || 'NULL/EMPTY'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })

  console.log('\n📋 Status distribution (sample of 1000 rows):')
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

  // Count transmitted
  const { count: transmitted } = await supabase
    .from('imported_books_staging')
    .select('*', { count: 'exact', head: true })
    .eq('final_status', 'Transmitted')

  console.log('\n✅ Transmitted (exact match):', transmitted?.toLocaleString())

  // Count with case-insensitive
  const { count: transmittedLike } = await supabase
    .from('imported_books_staging')
    .select('*', { count: 'exact', head: true })
    .ilike('final_status', 'transmitted')

  console.log('✅ Transmitted (case-insensitive):', transmittedLike?.toLocaleString())

  // Count non-null statuses
  const { count: withStatus } = await supabase
    .from('imported_books_staging')
    .select('*', { count: 'exact', head: true })
    .not('final_status', 'is', null)

  console.log('✅ Rows with status (not null):', withStatus?.toLocaleString())

  // Count null statuses
  const { count: nullStatus } = await supabase
    .from('imported_books_staging')
    .select('*', { count: 'exact', head: true })
    .is('final_status', null)

  console.log('✅ Rows with NULL status:', nullStatus?.toLocaleString())

  console.log('\n📊 Summary:')
  console.log(`  Total: ${total?.toLocaleString()}`)
  console.log(`  With status: ${withStatus?.toLocaleString()}`)
  console.log(`  NULL status: ${nullStatus?.toLocaleString()}`)
  console.log(`  Transmitted: ${transmittedLike?.toLocaleString()}`)
}

checkCounts().catch(console.error)
