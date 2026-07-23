import { authRequest, getApiBaseUrl, clearTokenData, fetchUserProfile, refreshAccessToken } from '@/lib/auth-api'
import type { LoginCredentials, RegisterCredentials, AuthResponse, AuthUser } from '../types/auth.types'

const apiUrl = getApiBaseUrl()

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return authRequest({ endpoint: '/api/auth/login', payload: credentials as unknown as Record<string, unknown> }) as Promise<AuthResponse>
}

export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  return authRequest({ endpoint: '/api/auth/register', payload: credentials as unknown as Record<string, unknown> }) as Promise<AuthResponse>
}

export async function logout(): Promise<void> {
  await clearTokenData()
}

export async function refreshToken(): Promise<boolean> {
  return refreshAccessToken()
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return fetchUserProfile() as Promise<AuthUser | null>
}

export function getSsoLoginUrl(): string {
  return `${apiUrl}/api/auth/innodata`
}
