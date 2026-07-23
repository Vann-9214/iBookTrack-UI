'use client'

import { useRouter } from 'next/navigation'
import { useBrand } from '@/hooks/use-brand'
import { cn } from '@/lib/utils'
import { useQrScanner } from '@/features/qr-scanner/hooks'
import {
  QrScannerHeader,
  ScanQrCamera,
  BarcodeResultCard,
  QrResultCard,
} from '@/features/qr-scanner/components'

export default function QrScannerPage() {
  const router = useRouter()
  const { colors, brand } = useBrand()
  const { scanResult, handleScan, clearScanResult } = useQrScanner()

  return (
    <div className={cn("flex flex-col h-screen overflow-hidden bg-background", `theme-${brand}`)}>
      <QrScannerHeader accentColor={colors.accent} onBack={() => router.back()} />

      <main className="ambient-bg flex-1 overflow-y-auto p-4 space-y-4">
        <ScanQrCamera onScan={handleScan} accentColor={colors.accent} />

        {scanResult && (
          scanResult.kind === 'barcode'
            ? <BarcodeResultCard result={scanResult} onRemove={clearScanResult} />
            : <QrResultCard result={scanResult} onRemove={clearScanResult} />
        )}
      </main>
    </div>
  )
}
