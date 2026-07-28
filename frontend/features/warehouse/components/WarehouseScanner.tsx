'use client'

import { ScannerInput } from '@/components/scanner-input'
import { useBrand } from '@/hooks/use-brand'

interface WarehouseScannerProps {
  onScan: (isbn: string) => void
}

export function WarehouseScanner({ onScan }: WarehouseScannerProps) {
  const { brand } = useBrand()

  return <ScannerInput onScan={onScan} brand={brand} />
}
