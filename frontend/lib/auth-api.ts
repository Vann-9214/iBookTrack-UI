import { toast } from 'sonner'

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
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        await clearTokenData()
      }
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

// Helper to show a unified rate-limit toast with wait time
function handleRateLimitToast(res: Response) {
  const retryAfter = res.headers.get('Retry-After')
  const rateLimitReset = res.headers.get('RateLimit-Reset')
  
  let waitMessage = 'Please wait a moment.'
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10)
    if (!isNaN(seconds)) {
      const mins = Math.ceil(seconds / 60)
      waitMessage = `Please wait ${mins} minute${mins !== 1 ? 's' : ''}.`
    }
  } else if (rateLimitReset) {
    const resetTime = parseInt(rateLimitReset, 10) * 1000
    if (!isNaN(resetTime)) {
      const diff = Math.max(0, resetTime - Date.now())
      const mins = Math.ceil(diff / 60000)
      waitMessage = `Please wait ${mins} minute${mins !== 1 ? 's' : ''}.`
    }
  }
  
  toast.error('Too many requests', {
    description: waitMessage,
    id: 'global-rate-limit-toast',
    duration: 10000,
  })
}

// Drop-in fetch wrapper — refreshes token if expired, redirects to /login on 401
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  options.credentials = 'include'
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  let res = await fetch(url, { ...options, headers })

  if (res.status === 429) {
    handleRateLimitToast(res)
  }

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
    if (response.status === 429) {
      handleRateLimitToast(response)
    }

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
export async function fetchUserProfile(): Promise<{ id: string; name: string; email: string; role?: string | null } | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
      credentials: 'include'
    })

    if (response.status === 401 || response.status === 403) {
      return null
    }

    if (!response.ok) {
      if (response.status === 429) {
        handleRateLimitToast(response)
        return { id: 'rate-limited', name: 'Rate Limited', email: 'rate-limited', role: null }
      }
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }
}