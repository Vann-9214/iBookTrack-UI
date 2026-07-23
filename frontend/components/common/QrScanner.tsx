'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { cn } from '@/lib/utils'

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
]

export type ScanFormat = 'qr' | 'barcode'

export interface QrScannerProps {
  onScan: (decodedText: string, format: ScanFormat) => void
  accentColor?: string
}

const CONTAINER_ID = 'qr-reader-container'

export function QrScanner({ onScan, accentColor }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasScannedRef = useRef(false)

  useEffect(() => {
    scannerRef.current = new Html5Qrcode(CONTAINER_ID, {
      verbose: false,
      formatsToSupport: SUPPORTED_FORMATS,
    })

    return () => {
      const scanner = scannerRef.current
      if (scanner) {
        const state = scanner.getState()
        if (
          state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED
        ) {
          scanner.stop().catch(() => {})
        }
      }
    }
  }, [])

  const start = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    setError(null)
    hasScannedRef.current = false

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText, result) => {
          if (hasScannedRef.current) return
          hasScannedRef.current = true
          const fmt = result?.result?.format?.format === Html5QrcodeSupportedFormats.QR_CODE
            ? 'qr'
            : 'barcode'
          onScan(decodedText, fmt as ScanFormat)
          stop()
        },
        () => {
          // per-frame error — intentionally ignored
        },
      )
      setIsScanning(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('permission')
        ? 'Camera permission denied. Please allow camera access and try again.'
        : `Could not start camera: ${msg}`)
    }
  }

  const stop = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    const state = scanner.getState()
    if (
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED
    ) {
      await scanner.stop().catch(() => {})
    }
    setIsScanning(false)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id={CONTAINER_ID}
        className="w-full max-w-sm rounded-xl overflow-hidden border border-border bg-black"
        style={{ minHeight: 280 }}
      />

      {error && (
        <p className="text-sm text-destructive text-center px-2">{error}</p>
      )}

      <button
        type="button"
        onClick={isScanning ? stop : start}
        className={cn(
          'px-6 py-2.5 rounded-full text-sm font-semibold transition-colors',
          isScanning
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'text-white hover:opacity-90',
        )}
        style={!isScanning ? { backgroundColor: accentColor ?? '#1658EB' } : undefined}
      >
        {isScanning ? 'Stop Scanning' : 'Start Scanning'}
      </button>
    </div>
  )
}
