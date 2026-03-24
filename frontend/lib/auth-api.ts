type AuthRequestOptions = {
  endpoint: '/api/auth/login' | '/api/auth/register'
  payload: Record<string, unknown>
}

type AuthSuccess = {
  message?: string
  error?: string
  access_token?: string
  refresh_token?: string
  expires_at?: number
  user?: {
    id?: string
    email?: string
    name?: string
  }
}

type TokenData = {
  access_token: string
  refresh_token: string
  expires_at: number
}

function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`
  }

  return 'http://localhost:5000'
}

// Store token data
export function storeTokenData(accessToken: string, refreshToken: string, expiresAt: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('token_expires_at', expiresAt.toString())
  }
}

// Retrieve token data
export function getTokenData(): TokenData | null {
  if (typeof window === 'undefined') return null
  
  const accessToken = localStorage.getItem('access_token')
  const refreshToken = localStorage.getItem('refresh_token')
  const expiresAtStr = localStorage.getItem('token_expires_at')

  if (!accessToken || !refreshToken || !expiresAtStr) return null

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: parseInt(expiresAtStr, 10),
  }
}

// Clear token data
export function clearTokenData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expires_at')
  }
}

// Check if token is expired (with 5-minute buffer)
export function isTokenExpired(): boolean {
  const tokenData = getTokenData()
  if (!tokenData) return true

  const now = Math.floor(Date.now() / 1000)
  const buffer = 5 * 60 // 5 minutes
  return tokenData.expires_at - buffer < now
}

// Refresh the access token
export async function refreshAccessToken(): Promise<boolean> {
  const tokenData = getTokenData()
  if (!tokenData) return false

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokenData.refresh_token }),
    })

    if (!response.ok) {
      clearTokenData()
      return false
    }

    const data = await response.json()
    if (data.access_token && data.expires_at) {
      storeTokenData(data.access_token, tokenData.refresh_token, data.expires_at)
      return true
    }

    return false
  } catch (error) {
    console.error('Token refresh failed:', error)
    clearTokenData()
    return false
  }
}

// Get a valid access token (refresh if needed)
export async function getValidAccessToken(): Promise<string | null> {
  if (isTokenExpired()) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) return null
  }

  const tokenData = getTokenData()
  return tokenData?.access_token || null
}

export async function authRequest({ endpoint, payload }: AuthRequestOptions): Promise<AuthSuccess> {
  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const responseBody = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    if (isJson && responseBody && typeof responseBody === 'object' && 'error' in responseBody) {
      throw new Error(String(responseBody.error || 'Request failed.'))
    }

    if (typeof responseBody === 'string' && responseBody.trim().startsWith('<!DOCTYPE')) {
      throw new Error(`Request failed with ${response.status}. Check NEXT_PUBLIC_API_URL or backend availability.`)
    }

    throw new Error(`Request failed with ${response.status}.`)
  }

  if (!isJson) {
    throw new Error('API returned a non-JSON success response.')
  }

  return responseBody as AuthSuccess
}