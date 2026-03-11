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