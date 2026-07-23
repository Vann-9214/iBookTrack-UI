import type { BookEntry, QrResult } from '../types/qr-scanner.types'

// Maps raw rejection_reason slugs to readable labels
export const REJECTION_LABELS: Record<string, string> = {
  'bleed-through':        'Bleed-through on page',
  'brittle':              'Brittle on page',
  'cannot-detach-sticky': 'Cannot be detached / sticky pages',
  'cd-only':              'CD only, no text content',
  'map-spanning':         'Contains a map spanning the entire book',
  'split-pages':          'Contains split pages',
  'cutoff-text':          'Cutoff text on page',
  'illegible-text':       'Illegible text',
  'inverted-contrast':    'Inverted contrast',
  'missing-pages':        'Missing page/s',
  'no-content':           'No content or body text',
  'obscured-highlight':   'Obscured text (highlight marker)',
  'obscured-watermark':   'Obscured text (watermark)',
  'oversized':            'Oversized',
  'pen-marks':            'Pen marks on page',
  'pop-up-book':          'Pop-up book',
  'postcard-only':        'Postcard only',
  'stained-dirty':        'Stained or dirty page',
  'stamp-mark':           'Stamp mark on page',
  'thick-cardboard':      'Thick / cardboard pages',
  'torn-pages':           'Torn pages',
  'missing':              'Missing',
  'extra':                'Extra',
}

// ─────────────────────────────────────────────────────────────────────────────
// QR parser  —  LOT:lot 5|BOX:1/11|TYPE:Mustang|BOOKS:isbn1=P;isbn2=NP
// ─────────────────────────────────────────────────────────────────────────────
export function parseQr(raw: string): QrResult {
  const fields: Record<string, string> = {}
  raw.split('|').forEach((seg) => {
    const i = seg.indexOf(':')
    if (i === -1) return
    fields[seg.slice(0, i).trim().toUpperCase()] = seg.slice(i + 1).trim()
  })

  const books: BookEntry[] = (fields['BOOKS'] ?? '')
    .split(';')
    .filter(Boolean)
    .map((entry, idx) => {
      const eq = entry.indexOf('=')
      return {
        no: idx + 1,
        isbn: eq === -1 ? entry : entry.slice(0, eq),
        title: '—',
        status: eq === -1 ? '' : entry.slice(eq + 1),
      }
    })

  return {
    kind:      'qr',
    lot:       fields['LOT']  ?? '—',
    box:       fields['BOX']  ?? '—',
    bookCount: books.length,
    type:      fields['TYPE'] ?? '—',
    books,
  }
}
