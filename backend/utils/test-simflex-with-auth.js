import axios from 'axios'

const SIMFLEX_ENDPOINT = 'https://simflex.innodata.com/wms.services/'
const SIMFLEX_API_KEY = '00001111'
const SIMFLEX_CONFIG = '045_Test'
const VALID_USERS = ['3V0', '7MF', 'IS9', 'ISA', 'GCE', '6G0', 'EN4', 'GD9']

console.log('\n🔍 Testing Simflex API with User Authentication...\n')
console.log('='.repeat(60) + '\n')

async function testWithUser(username) {
  console.log(`\n📝 Testing with user: ${username}`)
  console.log('-'.repeat(40))
  
  const client = axios.create({
    baseURL: SIMFLEX_ENDPOINT,
    timeout: 15000
  })
  
  // Try different authentication methods
  const authMethods = [
    {
      name: 'Username in header',
      config: {
        headers: {
          'apikey': SIMFLEX_API_KEY,
          'username': username,
          'user': username
        },
        params: { config: SIMFLEX_CONFIG }
      }
    },
    {
      name: 'Username in query params',
      config: {
        headers: { 'apikey': SIMFLEX_API_KEY },
        params: {
          config: SIMFLEX_CONFIG,
          username: username,
          user: username
        }
      }
    },
    {
      name: 'Basic Auth',
      config: {
        auth: {
          username: username,
          password: SIMFLEX_API_KEY
        },
        params: { config: SIMFLEX_CONFIG }
      }
    },
    {
      name: 'Bearer Token with username',
      config: {
        headers: {
          'Authorization': `Bearer ${SIMFLEX_API_KEY}`,
          'X-Username': username
        },
        params: { config: SIMFLEX_CONFIG }
      }
    }
  ]
  
  for (const method of authMethods) {
    try {
      console.log(`  Trying: ${method.name}...`)
      const response = await client.get('/', method.config)
      console.log(`  ✅ SUCCESS with ${method.name}!`)
      console.log(`  Status: ${response.status}`)
      console.log(`  Data:`, JSON.stringify(response.data, null, 2).substring(0, 300))
      return { success: true, username, method: method.name }
    } catch (error) {
      console.log(`  ❌ ${error.response?.status || error.message}`)
    }
  }
  
  return { success: false, username }
}

async function testAllUsers() {
  console.log('Testing all valid usernames from config...\n')
  
  const results = []
  
  for (const user of VALID_USERS) {
    const result = await testWithUser(user)
    results.push(result)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 RESULTS:\n')
  
  const successful = results.filter(r => r.success)
  
  if (successful.length > 0) {
    console.log('✅ SUCCESSFUL AUTHENTICATIONS:')
    successful.forEach(r => {
      console.log(`  - User: ${r.username}, Method: ${r.method}`)
    })
  } else {
    console.log('❌ No successful authentications')
    console.log('\nPossible reasons:')
    console.log('1. API endpoint structure is different')
    console.log('2. Need to call a login endpoint first')
    console.log('3. Authentication happens differently')
    console.log('4. The API key is expired/wrong')
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
}

testAllUsers().catch(console.error)
