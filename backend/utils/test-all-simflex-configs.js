import axios from 'axios'
import sql from 'mssql'

console.log('\n🔍 Testing ALL Simflex Configurations...\n')
console.log('='.repeat(60) + '\n')

// ============================================
// TEST 1: MDE WFH API
// ============================================
async function testMDE_WFH_API() {
  console.log('📡 TEST 1: MDE WFH API - trying multiple API keys')
  console.log('Endpoint: https://simflex.innodata.com/wms.services/')
  console.log('Config: 045_Test\n')
  
  const client = axios.create({
    baseURL: 'https://simflex.innodata.com/wms.services/',
    timeout: 15000
  })

  const apiKeys = ['00001111', '9fe71892-a94f-446a-a79d-a273b2ed4ba6']
  const configs = ['045_Test', '046', 'MUSSP']
  const endpoints = ['/', '/api', '/scanning', '/scans', '/dashboard', '/summary', '/GetScanData', '/GetScanSummary']

  for (const apiKey of apiKeys) {
    for (const config of configs) {
      for (const endpoint of endpoints) {
        try {
          const response = await client.get(endpoint, {
            headers: { 'apikey': apiKey },
            params: { config }
          })
          console.log(`✅ SUCCESS! Key: ${apiKey} | Config: ${config} | Endpoint: ${endpoint}`)
          console.log('Status:', response.status)
          console.log('Data:', JSON.stringify(response.data, null, 2).substring(0, 500))
          return true
        } catch (error) {
          console.log(`❌ ${error.response?.status || error.message} | Key: ${apiKey} | Config: ${config} | Endpoint: ${endpoint}`)
        }
      }
    }
  }
  return false
}

// ============================================
// TEST 2: US WFH API
// ============================================
async function testUS_WFH_API() {
  console.log('\n' + '-'.repeat(60) + '\n')
  console.log('📡 TEST 2: US WFH API')
  console.log('Endpoint: https://ussimflex.innodata.com/wms.services/')
  console.log('API Key: 9fe71892-a94f-446a-a79d-a273b2ed4ba6')
  console.log('Config: MUSSP\n')
  
  const client = axios.create({
    baseURL: 'https://ussimflex.innodata.com/wms.services/',
    timeout: 15000
  })
  
  try {
    const response = await client.get('/', {
      headers: { 'apikey': '9fe71892-a94f-446a-a79d-a273b2ed4ba6' },
      params: { config: 'MUSSP' }
    })
    console.log('✅ SUCCESS!')
    console.log('Status:', response.status)
    console.log('Data:', JSON.stringify(response.data, null, 2).substring(0, 500))
    return true
  } catch (error) {
    console.log('❌ FAILED:', error.message)
    if (error.response) {
      console.log('Status:', error.response.status)
    }
    return false
  }
}

// ============================================
// TEST 3: MDE On-Prem Database
// ============================================
async function testMDE_OnPrem_DB() {
  console.log('\n' + '-'.repeat(60) + '\n')
  console.log('💾 TEST 3: MDE On-Prem Database')
  console.log('Server: 10.250.0.227:50982')
  console.log('Database: JAGSP_WMS')
  console.log('User: oos\n')
  
  const config = {
    server: '10.250.0.227',
    port: 50982,
    database: 'JAGSP_WMS',
    user: 'oos',
    password: 'it-oos',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    },
    connectionTimeout: 15000,
    requestTimeout: 15000
  }
  
  try {
    const pool = await sql.connect(config)
    console.log('✅ CONNECTION SUCCESS!')
    
    // Try a simple query
    const result = await pool.request().query('SELECT @@VERSION as version')
    console.log('Database Version:', result.recordset[0].version.substring(0, 100))
    
    // Try to list tables
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `)
    console.log('\n📋 Available Tables:')
    tables.recordset.forEach(t => console.log('  -', t.TABLE_NAME))
    
    await pool.close()
    return true
  } catch (error) {
    console.log('❌ FAILED:', error.message)
    return false
  }
}

// ============================================
// TEST 4: US On-Prem Database (Alternative)
// ============================================
async function testUS_OnPrem_DB_Alt() {
  console.log('\n' + '-'.repeat(60) + '\n')
  console.log('💾 TEST 4: US On-Prem Database (Alternative)')
  console.log('Server: 10.200.98.83:50980')
  console.log('Database: MUSTANGUS_WMS')
  console.log('User: oos\n')
  
  const config = {
    server: '10.200.98.83',
    port: 50980,
    database: 'MUSTANGUS_WMS',
    user: 'oos',
    password: 'it-oos',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    },
    connectionTimeout: 15000,
    requestTimeout: 15000
  }
  
  try {
    const pool = await sql.connect(config)
    console.log('✅ CONNECTION SUCCESS!')
    
    const result = await pool.request().query('SELECT @@VERSION as version')
    console.log('Database Version:', result.recordset[0].version.substring(0, 100))
    
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `)
    console.log('\n📋 Available Tables:')
    tables.recordset.forEach(t => console.log('  -', t.TABLE_NAME))
    
    await pool.close()
    return true
  } catch (error) {
    console.log('❌ FAILED:', error.message)
    return false
  }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  const results = {
    mde_wfh_api: false,
    us_wfh_api: false,
    mde_onprem_db: false,
    us_onprem_db: false
  }
  
  results.mde_wfh_api = await testMDE_WFH_API()
  results.us_wfh_api = await testUS_WFH_API()
  results.mde_onprem_db = await testMDE_OnPrem_DB()
  results.us_onprem_db = await testUS_OnPrem_DB_Alt()
  
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 FINAL RESULTS:\n')
  console.log('MDE WFH API:        ', results.mde_wfh_api ? '✅ SUCCESS' : '❌ FAILED')
  console.log('US WFH API:         ', results.us_wfh_api ? '✅ SUCCESS' : '❌ FAILED')
  console.log('MDE On-Prem DB:     ', results.mde_onprem_db ? '✅ SUCCESS' : '❌ FAILED')
  console.log('US On-Prem DB (Alt):', results.us_onprem_db ? '✅ SUCCESS' : '❌ FAILED')
  
  const anySuccess = Object.values(results).some(r => r === true)
  
  if (anySuccess) {
    console.log('\n🎉 At least one connection method works!')
    console.log('Use the successful configuration in your code.')
  } else {
    console.log('\n⚠️  None of the configurations worked.')
    console.log('You need to get the correct credentials from your team.')
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
}

runAllTests().catch(console.error)
