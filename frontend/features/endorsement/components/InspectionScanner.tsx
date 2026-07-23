import React from 'react'
import { ScannerInput } from '@/components/scanner-input'

interface InspectionScannerProps {
  onScan: (isbn: string) => void
}

export const InspectionScanner: React.FC<InspectionScannerProps> = ({ onScan }) => {
  return <ScannerInput onScan={onScan} />
}
