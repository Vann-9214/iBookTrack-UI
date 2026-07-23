import { authFetch, fetchUserProfile } from '@/lib/auth-api'
import type { ProfileUpdatePayload, PasswordUpdatePayload, ApiResponse } from '../types/settings.types'

export async function getProfile() {
  return await fetchUserProfile()
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<ApiResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

  const response = await authFetch(`${apiUrl}/api/auth/profile`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
    }),
  })

  const data = (await response.json()) as ApiResponse
  if (!response.ok) {
    throw new Error(data.error || 'Profile update failed')
  }

  return data
}

export async function updatePassword(payload: PasswordUpdatePayload): Promise<ApiResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is missing in environment variables.')

  const response = await authFetch(`${apiUrl}/api/auth/password`, {
    method: 'POST',
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    }),
  })

  const data = (await response.json()) as ApiResponse
  if (!response.ok) {
    throw new Error(data.error || 'Password update failed')
  }

  return data
}
