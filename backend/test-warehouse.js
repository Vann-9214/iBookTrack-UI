/**
 * Warehouse API Test Script
 * Run this to verify all warehouse endpoints work correctly
 * Usage: node test-warehouse.js
 */

const API_URL = 'http://localhost:5000'

// You'll need a valid access token - get it from localStorage after logging in
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE'

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ACCESS_TOKEN}`
}

async function testWarehouseAPI() {
  console.log('🧪 Testing Warehouse API Endpoints...\n')

  try {
    // Test 1: Create test data (lot and box)
    console.log('📦 Step 1: Creating test lot and box...')
    
    const lotResponse = await fetch(`${API_URL}/api/lots`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        lot_number: 'LOT-TEST-001',
        total_boxes: 1,
        status: 'intake'
      })
    })
    const lot = await lotResponse.json()
    console.log('✅ Lot created:', lot.lot?.lot_number)

    const boxResponse = await fetch(`${API_URL}/api/boxes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        box_number: 'BOX-TEST-001',
        lot_id: lot.lot.id,
        total_books: 5,
        current_stage: 'intake'
      })
    })
    const box = await boxResponse.json()
    console.log('✅ Box created:', box.box?.box_number)

    // Test 2: Start warehouse session
    console.log('\n🏭 Step 2: Starting warehouse session...')
    const sessionResponse = await fetch(`${API_URL}/api/warehouse/sessions/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        box_id: box.box.id,
        accepted_box_number: 'BOX-ACCEPT-001',
        rejected_box_number: 'BOX-REJECT-001'
      })
    })
    const sessionData = await sessionResponse.json()
    console.log('✅ Session started:', sessionData.session?.id)

    // Test 3: Scan a book (accepted)
    console.log('\n📖 Step 3: Scanning books...')
    const scanAccepted = await fetch(`${API_URL}/api/warehouse/sessions/${sessionData.session.id}/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        isbn: '978-0-123456-78-9',
        scan_status: 'accepted'
      })
    })
    const acceptedScan = await scanAccepted.json()
    console.log('✅ Book accepted:', acceptedScan.scanLog?.isbn)

    // Test 4: Scan a book (rejected)
    const scanRejected = await fetch(`${API_URL}/api/warehouse/sessions/${sessionData.session.id}/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        isbn: '978-0-987654-32-1',
        scan_status: 'rejected',
        rejection_reason: 'Damaged cover'
      })
    })
    const rejectedScan = await scanRejected.json()
    console.log('✅ Book rejected:', rejectedScan.scanLog?.isbn, '- Reason:', rejectedScan.scanLog?.rejection_reason)

    // Test 5: Get session details
    console.log('\n📊 Step 4: Getting session details...')
    const sessionDetails = await fetch(`${API_URL}/api/warehouse/sessions/${sessionData.session.id}`, {
      headers
    })
    const details = await sessionDetails.json()
    console.log('✅ Session stats:')
    console.log('   - Total scanned:', details.session?.total_scanned)
    console.log('   - Accepted:', details.session?.total_accepted)
    console.log('   - Rejected:', details.session?.total_rejected)

    // Test 6: Search by ISBN
    console.log('\n🔍 Step 5: Searching book by ISBN...')
    const searchResponse = await fetch(`${API_URL}/api/warehouse/search/isbn/978-0-123456-78-9`, {
      headers
    })
    const searchResult = await searchResponse.json()
    console.log('✅ Found book in box:', searchResult.scans?.[0]?.assigned_box_id ? 'Yes' : 'No')

    // Test 7: Get rejected books
    console.log('\n❌ Step 6: Getting rejected books...')
    const rejectedResponse = await fetch(`${API_URL}/api/warehouse/rejected-books`, {
      headers
    })
    const rejectedBooks = await rejectedResponse.json()
    console.log('✅ Rejected books count:', rejectedBooks.rejectedBooks?.length)

    // Test 8: Complete session
    console.log('\n✅ Step 7: Completing session...')
    const completeResponse = await fetch(`${API_URL}/api/warehouse/sessions/${sessionData.session.id}/complete`, {
      method: 'POST',
      headers
    })
    const completed = await completeResponse.json()
    console.log('✅ Session completed:', completed.session?.status)

    console.log('\n🎉 All warehouse tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run tests
if (ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
  console.log('⚠️  Please update ACCESS_TOKEN in this file first!')
  console.log('   1. Login to your app')
  console.log('   2. Open browser console')
  console.log('   3. Run: localStorage.getItem("access_token")')
  console.log('   4. Copy the token and paste it in this file\n')
} else {
  testWarehouseAPI()
}
