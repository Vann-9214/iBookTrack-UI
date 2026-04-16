import axios from 'axios'

const BASE = 'https://simflex.innodata.com/wms.services/'
const KEYS = ['00001111', '9fe71892-a94f-446a-a79d-a273b2ed4ba6']
const CONFIGS = ['045_Test', '046']

// WCF / SOAP / REST patterns common in .NET WMS services
const WCF_ENDPOINTS = [
  'WMSService.svc',
  'WMSService.svc/json',
  'WMSService.svc/xml',
  'ScanService.svc',
  'ScanService.svc/json',
  'BookScanService.svc',
  'DashboardService.svc',
  'api/scan',
  'api/scans',
  'api/dashboard',
  'api/GetScans',
  'api/GetScanData',
  'api/GetDashboard',
  'Scan/GetAll',
  'Scan/GetToday',
  'Dashboard/GetData',
  'Service.svc',
  'Service.svc/json',
]

async function testWCFEndpoints() {
  console.log('\n🔍 Testing WCF/SOAP-style endpoints...\n')

  for (const key of KEYS) {
    console.log(`\n🔑 API Key: ${key}`)
    console.log('='.repeat(60))

    for (const endpoint of WCF_ENDPOINTS) {
      for (const config of CONFIGS) {
        const client = axios.create({ baseURL: BASE, timeout: 10000 })
        try {
          const res = await client.get(endpoint, {
            headers: { 'apikey': key },
            params: { config, apikey: key }
          })
          console.log(`✅ SUCCESS! Endpoint: ${endpoint} | Config: ${config}`)
          console.log('Data:', JSON.stringify(res.data, null, 2).substring(0, 300))
          process.exit(0)
        } catch (err) {
          const status = err.response?.status
          // Only log non-404 errors (interesting responses)
          if (status && status !== 404) {
            console.log(`⚠️  ${status} | ${endpoint} | Config: ${config}`)
          }
        }
      }
    }
  }

  console.log('\n❌ No working endpoint found.')
  console.log('\n💡 Try decompiling WMSConnect.dll to find exact endpoint names.')
}

testWCFEndpoints().catch(console.error)
