import { authFetch } from './auth-api'

export const fetcher = async (url: string) => {
  const res = await authFetch(url)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'An error occurred while fetching the data.')
  }
  return res.json()
}
