import { FLAG_ISSUES } from '@/constants/flag-issues'

export const issueLabel = (val: string): string => {
  return FLAG_ISSUES.find((i: { value: string; label: string }) => i.value === val)?.label || val
}

