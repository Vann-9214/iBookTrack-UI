import axios from 'axios'

// Simflex WMS API Configuration (WFH mode)
const SIMFLEX_ENDPOINT = 'https://simflex.innodata.com/wms.services/'
const SIMFLEX_API_KEY = '00001111'
const SIMFLEX_CONFIG_NAME = '045_Test'

const client = axios.create({
  baseURL: SIMFLEX_ENDPOINT,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': SIMFLEX_API_KEY
  },
  timeout: 30000
})

/**
 * Get scanning summary from Simflex API
 * Note: This is a placeholder - actual API endpoints need to be confirmed
 */
export async function getTodayScanningSummary() {
  try {
    // TODO: Replace with actual Simflex API endpoint
    const response = await client.get('/scanning/summary', {
      params: {
        config: SIMFLEX_CONFIG_NAME,
        date: new Date().toISOString().split('T')[0]
      }
    })
    
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error('Error fetching scanning summary from API:', error.message)
    return {
      success: false,
      error: error.message,
      message: 'Simflex API endpoint needs to be configured'
    }
  }
}

/**
 * Alternative: Return mock data for testing
 */
export async function getMockScanningSummary() {
  return {
    success: true,
    data: {
      TotalScans: 113,
      Completed: 105,
      Failed: 8,
      Ongoing: 0
    },
    note: 'This is mock data. Connect to VPN for real data.'
  }
}

export default {
  getTodayScanningSummary,
  getMockScanningSummary
}
