import { format, parseISO } from 'date-fns'

export function formatDate(dateString: string | null | undefined, formatPattern = 'MMM d, yyyy HH:mm'): string {
  if (!dateString) return '—'
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return format(date, formatPattern)
  } catch {
    return '—'
  }
}

export function formatTimeInHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '—'
  if (hours === 0) return '0m'
  const totalMins = Math.round(hours * 60)
  if (totalMins === 0) return '0m'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
