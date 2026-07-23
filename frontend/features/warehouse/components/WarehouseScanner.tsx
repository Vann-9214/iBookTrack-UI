'use client'

import { ScannerInput } from '@/components/scanner-input'

interface WarehouseScannerProps {
  onScan: (isbn: string) => void
}

export function WarehouseScanner({ onScan }: WarehouseScannerProps) {
  return <ScannerInput onScan={onScan} />
}
