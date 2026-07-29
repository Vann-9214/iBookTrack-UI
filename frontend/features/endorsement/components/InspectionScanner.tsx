import { ScannerInput } from '@/components/scanner-input'
import type { Brand } from '@/hooks/use-brand'

interface InspectionScannerProps {
  onScan: (isbn: string) => void
  brand: Brand
}

export function InspectionScanner({ onScan, brand }: InspectionScannerProps) {
  return <ScannerInput onScan={onScan} brand={brand} />
}
