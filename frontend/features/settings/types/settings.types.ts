export interface ProfileData {
  name: string
  email: string
  profilePicture: string | null
}

export interface PasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type SettingsTab = 'profile' | 'password'

export interface ProfileUpdatePayload {
  name: string
  email: string
}

export interface PasswordUpdatePayload {
  currentPassword: string
  newPassword: string
}

export interface ApiResponse {
  message?: string
  error?: string
}
