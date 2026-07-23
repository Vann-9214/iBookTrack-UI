export const PROFILE_PICTURE_KEY = 'ibooktrack_profile_picture'

export function getDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || ''

  const formattedName = localPart
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

  return formattedName || 'User Account'
}

export function getInitials(name: string, email: string): string {
  const source = name.trim() || getDisplayNameFromEmail(email)

  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'UA'
  )
}
