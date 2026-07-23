export function getDisplayNameFromEmail(email: string): string {
  if (!email) return 'User Account'
  const localPart = email.split('@')[0] || ''

  const formattedName = localPart
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

  return formattedName || 'User Account'
}

export function getInitials(name?: string | null, email?: string | null): string {
  const safeName = (name || '').trim()
  const safeEmail = (email || '').trim()
  const source = safeName || getDisplayNameFromEmail(safeEmail)

  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'UA'
  )
}
