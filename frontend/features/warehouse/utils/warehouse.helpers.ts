import { FLAG_ISSUES } from '@/constants/flag-issues'

export const WAREHOUSE_FLAG_ISSUES = [
  ...FLAG_ISSUES,
] as const

export type WarehouseFlagIssue = (typeof WAREHOUSE_FLAG_ISSUES)[number]['value']

export const isValidIsbn = (isbn: string): boolean => {
  const cleaned = isbn.replace(/[^0-9a-zA-Z]/g, '')
  return cleaned.length === 10 || cleaned.length === 13
}

export function normalizeLotNumber(lot: string): string {
  let cleaned = lot.toLowerCase().replace(/\s+/g, '').trim()
  if (!cleaned.startsWith('lot')) {
    if (/^\d/.test(cleaned)) cleaned = `lot${cleaned}`
  } else {
    cleaned = cleaned.replace(/^lot[-\s]*/, 'lot')
  }
  return cleaned
}

export function findSimilarLot(
  typedLot: string,
  existingLots: { lot_number: string }[]
): string | null {
  const normalized = normalizeLotNumber(typedLot)
  if (!normalized) return null
  for (const l of existingLots) {
    if (normalizeLotNumber(l.lot_number) === normalized) {
      return l.lot_number
    }
  }
  return null
}

export function normalizeBoxNumber(box: string): string {
  return box.toLowerCase().replace(/\s+/g, '').trim()
}

export function ilmsLotBoxMismatch(
  ilmsLot: string | undefined,
  ilmsBox: string | undefined,
  expectedLot: string,
  expectedBox: string
): { mismatched: boolean; ilmsLot: string; ilmsBox: string } {
  const ilmsLotValue = ilmsLot || ''
  const ilmsBoxValue = ilmsBox || ''
  const lotMismatch = normalizeLotNumber(ilmsLotValue) !== normalizeLotNumber(expectedLot)
  const boxMismatch = normalizeBoxNumber(ilmsBoxValue) !== normalizeBoxNumber(expectedBox)
  return {
    mismatched: (ilmsLotValue ? lotMismatch : false) || (ilmsBoxValue ? boxMismatch : false),
    ilmsLot: ilmsLotValue || expectedLot,
    ilmsBox: ilmsBoxValue || expectedBox,
  }
}

export function issueLabel(val: string): string {
  return WAREHOUSE_FLAG_ISSUES.find((i) => i.value === val)?.label || val
}
