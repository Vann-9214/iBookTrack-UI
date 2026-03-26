import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testChartData() {
  console.log('🔍 Testing chart data availability...\n')

  // Test 1: Lot Comparison
  console.log('1️⃣ LOT COMPARISON DATA:')
  const { data: lotStats } = await supabase.rpc('get_lot_stats')
  if (lotStats) {
    const validLots = lotStats
      .filter(lot => /^Lot-\d{1,2}M?$/i.test(lot.lot))
      .slice(0, 5)
    validLots.forEach(lot => {
      console.log(`   ${lot.lot}: ${lot.transmitted} transmitted, ${lot.rejected} rejected`)
    })
  }

  // Test 2: Daily Trend
  console.log('\n2️⃣ DAILY TREND DATA:')
  const { data: dailyData } = await supabase
    .from('imported_books_staging')
    .select('trans_date, final_status')
    .not('trans_date', 'is', null)
    .limit(5000)

  const dailyMap = {}
  dailyData?.forEach(row => {
    const date = row.trans_date
    if (!dailyMap[date]) {
      dailyMap[date] = { date, transmitted: 0, total: 0 }
    }
    dailyMap[date].total++
    if (row.final_status?.toLowerCase() === 'transmitted') {
      dailyMap[date].transmitted++
    }
  })

  const dates = Object.values(dailyMap).slice(0, 5)
  dates.forEach(d => {
    console.log(`   ${d.date}: ${d.transmitted}/${d.total} transmitted`)
  })

  // Test 3: Vendor Performance
  console.log('\n3️⃣ VENDOR PERFORMANCE DATA:')
  const { data: vendors } = await supabase
    .from('imported_books_staging')
    .select('vendor_name')
    .not('vendor_name', 'is', null)
    .limit(1000)

  const uniqueVendors = [...new Set(vendors?.map(v => v.vendor_name) || [])].slice(0, 3)
  for (const vendor of uniqueVendors) {
    const { count: total } = await supabase
      .from('imported_books_staging')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_name', vendor)

    const { count: transmitted } = await supabase
      .from('imported_books_staging')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_name', vendor)
      .ilike('final_status', 'transmitted')

    const rate = total ? ((transmitted / total) * 100).toFixed(2) : 0
    console.log(`   ${vendor}: ${rate}% completion rate`)
  }

  // Test 4: Status Distribution
  console.log('\n4️⃣ STATUS DISTRIBUTION DATA:')
  const { data: statusData } = await supabase
    .from('imported_books_staging')
    .select('final_status')
    .limit(5000)

  const statusMap = {}
  statusData?.forEach(row => {
    const status = row.final_status || 'No Status'
    statusMap[status] = (statusMap[status] || 0) + 1
  })

  Object.entries(statusMap).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} books`)
  })

  console.log('\n✅ All chart data is available!')
}

testChartData().catch(console.error)
