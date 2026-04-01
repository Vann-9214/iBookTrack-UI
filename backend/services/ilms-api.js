import axios from 'axios'

const ILMS_BASE_URL = process.env.ILMS_BASE_URL || 'https://iLMSStaging.innodata.com/book-server/api'
const ILMS_AUTH_TOKEN = process.env.ILMS_AUTH_TOKEN

class ILMSApiService {
  constructor() {
    this.client = axios.create({
      baseURL: ILMS_BASE_URL,
      headers: {
        'Authorization': ILMS_AUTH_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  async searchBookByISBN(isbn) {
    try {
      const response = await this.client.get('/searchBookByIsbnOrTitleOreISBNorAuthor', {
        params: { text: isbn }
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Error searching book by ISBN:', error.message)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  async searchBookByTitle(text) {
    try {
      const response = await this.client.get('/searchBookByTitleOrPublisherOrAuthor', {
        params: { text }
      })
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Error searching book by title:', error.message)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  async updateReceiveInfo(bookData) {
    try {
      const response = await this.client.post('/', bookData)
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('Error updating receive info:', error.message)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
  }

  async searchMultipleISBNs(isbns) {
    const results = []
    const batchSize = 10
    
    for (let i = 0; i < isbns.length; i += batchSize) {
      const batch = isbns.slice(i, i + batchSize)
      const promises = batch.map(isbn => this.searchBookByISBN(isbn))
      const batchResults = await Promise.all(promises)
      results.push(...batchResults)
      
      if (i + batchSize < isbns.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }
}

export const ilmsApi = new ILMSApiService()
