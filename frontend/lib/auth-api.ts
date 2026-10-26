import { mockRouter } from './mock-data/mock-router'
import { mockStore } from './mock-data/store'
export function getApiBaseUrl() { return '' }
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> { return mockRouter(url, options) }
export async function authRequest({ endpoint, payload }: { endpoint: '/api/auth/login' | '/api/auth/register'; payload: Record<string, unknown> }) {
  const response = await mockRouter(endpoint, { method: 'POST', body: JSON.stringify(payload) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Demo request failed')
  return data
}
export async function fetchUserProfile() { return mockStore.getState().user }
export async function refreshAccessToken() { return true }
export async function clearTokenData() { if (typeof window !== 'undefined') sessionStorage.removeItem('demo_logged_in') }
