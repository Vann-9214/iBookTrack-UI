export interface AuthUser {
  id: string
  name: string
  email: string
  role?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  message?: string
  error?: string
  user?: AuthUser
}

export interface AuthTeam {
  id: string
  label: string
  icon: string
  desc: string
  color: string
  shadow: string
}
