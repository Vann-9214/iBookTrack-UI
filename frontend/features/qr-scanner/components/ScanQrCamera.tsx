import React from 'react'
import dynamic from 'next/dynamic'
import type { ScanFormat } from '@/components/QrScanner'

const QrScannerComponent = dynamic(() => import('@/components/QrScanner').then(mod => mod.QrScanner), { ssr: false })

export interface ScanQrCameraProps {
  onScan: (text: string, format: ScanFormat) => void
  accentColor: string
}

export function ScanQrCamera({ onScan, accentColor }: ScanQrCameraProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground text-center mb-4">
        Point your camera at a QR code or barcode to scan it.
      </p>
      <QrScannerComponent onScan={onScan} accentColor={accentColor} />
    </div>
  )
}
