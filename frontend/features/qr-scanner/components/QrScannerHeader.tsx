import React from 'react'
import { ArrowLeft, ScanLine } from 'lucide-react'

export interface QrScannerHeaderProps {
  accentColor: string
  onBack: () => void
}

export function QrScannerHeader({ accentColor, onBack }: QrScannerHeaderProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background hover:bg-muted transition shrink-0"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <ScanLine className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
      <h1 className="text-base font-semibold text-foreground">QR / Barcode Scanner</h1>
    </div>
  )
}
