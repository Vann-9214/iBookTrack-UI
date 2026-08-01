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

// Only the display name is sent to the backend. The email address is the
// login identity and is display-only in Settings; the API rejects/ignores any
// attempt to modify it.
export interface ProfileUpdatePayload {
  name: string
}

export interface PasswordUpdatePayload {
  currentPassword: string
  newPassword: string
}

export interface ApiResponse {
  message?: string
  error?: string
}
