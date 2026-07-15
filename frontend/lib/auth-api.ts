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

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`
  }

  return 'http://localhost:5000'
}

// Store token data (Tokens are now handled by HttpOnly cookies, no need to store manually)
export function storeTokenData() {
  // No-op
}

// Retrieve token data (Not available to JS, handled via cookies)
export function getTokenData(): TokenData | null {
  return null
}

// Clear token data
export async function clearTokenData() {
  try {
    await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (err) {
    console.error('Logout failed:', err)
  }
}

// Check if token is expired
export function isTokenExpired(): boolean {
  return false // Can't check client-side, let API return 401
}

// Refresh the access token
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })

    if (!response.ok) {
      await clearTokenData()
      return false
    }

    return true
  } catch (error) {
    console.error('Token refresh failed:', error)
    const isNetworkError = error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))
    if (!isNetworkError) {
      await clearTokenData()
    }
    return false
  }
}

// Get a valid access token
export async function getValidAccessToken(): Promise<string | null> {
  // We can't access the token directly anymore. 
  // We just assume we have one in cookies.
  return "cookie-handled"
}

// Drop-in fetch wrapper — refreshes token if expired, redirects to /login on 401
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  options.credentials = 'include'
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  let res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      res = await fetch(url, { ...options, headers })
    }

    if (res.status === 401) {
      await clearTokenData()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expired. Please log in again.')
    }
  }

  return res
}

export async function authRequest({ endpoint, payload }: AuthRequestOptions): Promise<AuthSuccess> {
  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
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

// Fetch user profile
export async function fetchUserProfile(): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
      credentials: 'include'
    })

    if (!response.ok) return null

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }
}