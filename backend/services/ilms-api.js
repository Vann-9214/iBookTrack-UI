import axios from 'axios'

const ILMS_AUTH_TOKEN = process.env.ILMS_AUTH_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IklOMTgiLCJpYXQiOjE3MTM5NTM2NzAsImV4cCI6MTcxNDA0MDA3MH0.ZUCaQu8BSWXgiue5LQJ6ALfsAjhohrXVqpJDYkDVwqA'

const PROJECT_ENDPOINTS = {
  mustang: 'https://mstx.innodata.com/milms/book-server/api/searchBookByIsbnOrTitleOreISBNorAuthor',
  jaguar:  'https://jgur.innodata.com/JiLMS/book-server/api/searchBookByIsbnOrTitleOreISBNorAuthor',
}

// Legacy fallback URL
const ILMS_BASE_URL = process.env.ILMS_BASE_URL || 'https://iLMSStaging.innodata.com/book-server/api'

const HEADERS = {
  'Authorization': ILMS_AUTH_TOKEN,
  'Content-Type': 'application/json',
}

async function queryILMS(url, isbn) {
  try {
    const response = await axios.get(url, {
      params: { text: isbn },
      headers: HEADERS,
      timeout: 10000,
    })
    const data = response.data
    // ILMS returns an array; empty array or Message field = not found
    const hasResult = Array.isArray(data)
      ? data.length > 0 && !data[0]?.Message
      : data && !data.Message
    return { success: hasResult, data }
  } catch {
    return { success: false, data: null }
  }
}

class ILMSApiService {
  constructor() {
    this.client = axios.create({
      baseURL: ILMS_BASE_URL,
      headers: HEADERS,
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

  // Search a specific project's ILMS
  async searchByProject(isbn, project) {
    const url = PROJECT_ENDPOINTS[project]
    if (!url) return { success: false, data: null }
    return queryILMS(url, isbn)
  }

  // Query both ILMS endpoints in parallel — returns which project the ISBN belongs to
  async identifyProject(isbn) {
    const [mustangRes, jaguarRes] = await Promise.all([
      queryILMS(PROJECT_ENDPOINTS.mustang, isbn),
      queryILMS(PROJECT_ENDPOINTS.jaguar,  isbn),
    ])

    if (mustangRes.success && !jaguarRes.success) {
      return { project: 'mustang', data: mustangRes.data, mustang: mustangRes.data, jaguar: null }
    }
    if (jaguarRes.success && !mustangRes.success) {
      return { project: 'jaguar',  data: jaguarRes.data,  mustang: null, jaguar: jaguarRes.data }
    }
    if (mustangRes.success && jaguarRes.success) {
      // Found in both — return both, mark project as 'both'
      return { project: 'both', data: mustangRes.data, mustang: mustangRes.data, jaguar: jaguarRes.data }
    }
    return { project: 'unknown', data: null, mustang: null, jaguar: null }
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
