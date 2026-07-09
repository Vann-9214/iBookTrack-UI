'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { cn } from '@/lib/utils'

interface QrScannerProps {
  onScan: (decodedText: string) => void
  accentColor?: string
}

const CONTAINER_ID = 'qr-reader-container'

export function QrScanner({ onScan, accentColor }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasScannedRef = useRef(false)

  useEffect(() => {
    // Instantiate once; the DOM element must exist before this runs
    scannerRef.current = new Html5Qrcode(CONTAINER_ID, { verbose: false })

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
        (decodedText) => {
          if (hasScannedRef.current) return
          hasScannedRef.current = true
          onScan(decodedText)
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
      {/* Camera viewport — html5-qrcode injects its video element here */}
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
