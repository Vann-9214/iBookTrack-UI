export const BOOK_FLAG_ISSUES = [
  { value: 'bleed-through', label: 'Bleed-through on page' },
  { value: 'brittle', label: 'Brittle on page' },
  { value: 'cannot-detach-sticky', label: 'Cannot be detached or sticky pages' },
  { value: 'cd-only', label: 'CD only, no text content' },
  { value: 'map-spanning', label: 'Contains a map spanning the entire book' },
  { value: 'split-pages', label: 'Contains split pages' },
  { value: 'cutoff-text', label: 'Cutoff text on page' },
  { value: 'illegible-text', label: 'Illegible text' },
  { value: 'inverted-contrast', label: 'Inverted contrast: White on black background' },
  { value: 'missing-pages', label: 'Missing page/s' },
  { value: 'no-content', label: 'No content or body text' },
  { value: 'obscured-highlight', label: 'Obscured text due to highlight marker' },
  { value: 'obscured-watermark', label: 'Obscured text due to watermarks' },
  { value: 'oversized', label: 'Oversized and cannot fit in the scanner' },
  { value: 'pen-marks', label: 'Pen marks on page' },
  { value: 'pop-up-book', label: 'Pop-up book' },
  { value: 'postcard-only', label: 'Postcard only' },
  { value: 'stained-dirty', label: 'Stained or dirty page' },
  { value: 'stamp-mark', label: 'Stamp mark on page' },
  { value: 'thick-cardboard', label: 'Thick or cardboard pages' },
  { value: 'torn-pages', label: 'Torn pages' },
  { value: 'missing-from-warehouse', label: 'Missing from warehouse' },
  { value: 'missing-from-inventory', label: 'Missing from inventory' },
  { value: 'missing-from-endorsement', label: 'Missing from endorsement' },
  { value: 'mismatched-book', label: 'Mismatch Book from ILMS (Title)' },
  { value: 'extra-book', label: 'Extra Book from Packing Lists' },
] as const

export const FLAG_ISSUES = BOOK_FLAG_ISSUES

export type BookFlagIssue = (typeof BOOK_FLAG_ISSUES)[number]['value']
export type FlagIssue = BookFlagIssue

export function getFlagIssueLabel(value: string): string {
  const match = BOOK_FLAG_ISSUES.find((issue) => issue.value === value)
  return match ? match.label : value
}
