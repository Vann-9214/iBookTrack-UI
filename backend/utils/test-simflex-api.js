import axios from 'axios'

const SIMFLEX_ENDPOINT = 'https://simflex.innodata.com/wms.services/'
const SIMFLEX_API_KEY = '00001111'
const SIMFLEX_CONFIG = '045_Test'

const client = axios.create({
  baseURL: SIMFLEX_ENDPOINT,
  timeout: 30000
})

async function testSimflexAPI() {
  console.log('\n🔍 Testing Simflex API...\n')
  console.log('Base URL:', SIMFLEX_ENDPOINT)
  console.log('API Key:', SIMFLEX_API_KEY)
  console.log('Config:', SIMFLEX_CONFIG)
  console.log('\n' + '='.repeat(50) + '\n')

  // Test 1: Try root endpoint
  console.log('Test 1: GET /')
  try {
    const response = await client.get('/')
    console.log('✅ Success!')
    console.log('Status:', response.status)
    console.log('Data:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ Error:', error.message)
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Data:', error.response.data)
    }
  }
  console.log('\n' + '-'.repeat(50) + '\n')

  // Test 2: Try with API key in header
  console.log('Test 2: GET / (with API key in header)')
  try {
    const response = await client.get('/', {
      headers: {
        'X-API-Key': SIMFLEX_API_KEY,
        'Authorization': `Bearer ${SIMFLEX_API_KEY}`
      }
    })
    console.log('✅ Success!')
    console.log('Status:', response.status)
    console.log('Data:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ Error:', error.message)
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Data:', error.response.data)
    }
  }
  console.log('\n' + '-'.repeat(50) + '\n')

  // Test 3: Try with API key as query param
  console.log('Test 3: GET / (with API key as query param)')
  try {
    const response = await client.get('/', {
      params: {
        apikey: SIMFLEX_API_KEY,
        config: SIMFLEX_CONFIG
      }
    })
    console.log('✅ Success!')
    console.log('Status:', response.status)
    console.log('Data:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ Error:', error.message)
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Data:', error.response.data)
    }
  }
  console.log('\n' + '-'.repeat(50) + '\n')

  // Test 4: Try common API endpoints
  const endpoints = [
    '/api',
    '/scanning',
    '/scans',
    '/dashboard',
    '/summary',
    '/health',
    '/status'
  ]

  for (const endpoint of endpoints) {
    console.log(`Test: GET ${endpoint}`)
    try {
      const response = await client.get(endpoint, {
        headers: { 'X-API-Key': SIMFLEX_API_KEY },
        params: { config: SIMFLEX_CONFIG }
      })
      console.log('✅ Success!')
      console.log('Status:', response.status)
      console.log('Data:', JSON.stringify(response.data, null, 2).substring(0, 200))
    } catch (error) {
      console.log('❌ Error:', error.message)
      if (error.response) {
        console.log('Status:', error.response.status)
      }
    }
    console.log('\n' + '-'.repeat(50) + '\n')
  }

  console.log('\n✅ API exploration complete!\n')
}

testSimflexAPI().catch(console.error)
