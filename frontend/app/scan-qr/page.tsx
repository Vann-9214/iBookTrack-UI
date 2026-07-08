'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { authFetch, getApiBaseUrl } from '@/lib/auth-api'
import { useBrand, BRAND_COLORS } from '@/hooks/use-brand'
import {
  X,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Package,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  QrCode,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface BoxBook {
  id: string
  isbn: string
  title: string | null
  book_type: string | null
  scan_status: string
  scanned_at: string | null
}

interface BoxResult {
  id: string
  box_number: string
  current_stage: string
  total_books_expected: number
  books_transmitted: number
  created_at: string
  lot: { lot_number: string; type?: string } | null
  books: BoxBook[]
}

type ScanState = 'scanning' | 'loading' | 'result' | 'error'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  inventory: 'Inventory',
  cut: 'Cutting',
  qc: 'QC',
  scan: 'Scanning',
  qa: 'QA',
  transmit: 'Transmitted',
  storage: 'Storage',
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  warehouse: { bg: 'bg-gray-100', text: 'text-gray-700' },
  inventory: { bg: 'bg-slate-100', text: 'text-slate-700' },
  cut: { bg: 'bg-orange-100', text: 'text-orange-700' },
  qc: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  scan: { bg: 'bg-blue-100', text: 'text-blue-700' },
  qa: { bg: 'bg-purple-100', text: 'text-purple-700' },
  transmit: { bg: 'bg-green-100', text: 'text-green-700' },
  storage: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

function stageLabel(stage: string) {
  return STAGE_LABELS[stage] ?? stage
}

function stageBadge(stage: string) {
  const c = STAGE_COLORS[stage] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
  return `${c.bg} ${c.text}`
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function ScanQRPage() {
  const router = useRouter()
  const { brand } = useBrand()
  const colors = BRAND_COLORS[brand]

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastScannedRef = useRef<string | null>(null)

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [boxResult, setBoxResult] = useState<BoxResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cardVisible, setCardVisible] = useState(false)

  // ── Camera helpers ──────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    stopCamera()
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Check torch support
      const videoTrack = stream.getVideoTracks()[0]
      const capabilities = videoTrack.getCapabilities?.() as { torch?: boolean } | undefined
      setHasTorch(!!capabilities?.torch)
    } catch {
      setCameraError('Camera access denied or unavailable. Please allow camera permissions.')
    }
  }, [stopCamera])

  // ── Torch toggle ────────────────────────────────────────────────────────────

  const toggleTorch = useCallback(async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0]
    if (!videoTrack) return
    try {
      await videoTrack.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn((v) => !v)
    } catch {
      /* torch not supported on this device */
    }
  }, [torchOn])

  // ── QR scanning loop ────────────────────────────────────────────────────────

  const startScanLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const loop = async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        // Dynamically import jsQR to keep the bundle small
        const jsQR = (await import('jsqr')).default
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code && code.data && code.data !== lastScannedRef.current) {
          lastScannedRef.current = code.data
          handleQRFound(code.data)
          return
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── QR found handler ────────────────────────────────────────────────────────

  const handleQRFound = useCallback(async (raw: string) => {
    setScanState('loading')
    stopCamera()

    // The QR value may be a box number directly or a URL containing one
    // Try to parse a box number from the raw value
    const boxNumber = raw.trim()

    try {
      const res = await authFetch(
        `${getApiBaseUrl()}/api/boxes/by-number/${encodeURIComponent(boxNumber)}`
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `Box not found (${res.status})`)
      }
      const data = await res.json() as { box: BoxResult }
      setBoxResult(data.box)
      setScanState('result')
      // Slight delay so the layout settles before sliding up
      setTimeout(() => setCardVisible(true), 50)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setScanState('error')
      setTimeout(() => setCardVisible(true), 50)
    }
  }, [stopCamera])

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  useEffect(() => {
    startCamera(facingMode)
    return () => stopCamera()
  }, [facingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onPlay = () => startScanLoop()
    video.addEventListener('play', onPlay)
    return () => video.removeEventListener('play', onPlay)
  }, [startScanLoop])

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = () => {
    lastScannedRef.current = null
    setBoxResult(null)
    setErrorMsg(null)
    setCardVisible(false)
    setScanState('scanning')
    startCamera(facingMode)
  }

  const handleFlipCamera = () => {
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const showCamera = scanState === 'scanning' || scanState === 'loading'
  const showResult = scanState === 'result' || scanState === 'error'

  const processable = boxResult?.books.filter((b) => b.scan_status === 'processable').length ?? 0
  const nonProcessable = boxResult?.books.filter((b) => b.scan_status === 'non_processable').length ?? 0
  const totalScanned = boxResult?.books.length ?? 0

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden flex flex-col">
      {/* ── Camera feed ─────────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          !showCamera && 'hidden'
        )}
        playsInline
        muted
        autoPlay
      />

      {/* Hidden canvas for pixel reading */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Camera error overlay ─────────────────────────────────────────── */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white px-8 text-center gap-4">
          <QrCode className="w-16 h-16 text-white/40" />
          <p className="text-sm text-white/70">{cameraError}</p>
          <button
            onClick={() => router.back()}
            className="mt-2 px-6 py-2 rounded-full bg-white/10 border border-white/20 text-sm"
          >
            Go Back
          </button>
        </div>
      )}

      {/* ── Top controls ────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-safe-top pt-4 pb-3">
        {/* Close button */}
        <button
          onClick={() => { stopCamera(); router.back() }}
          className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Right-side controls */}
        <div className="flex flex-col gap-3">
          {/* Torch */}
          {hasTorch && showCamera && (
            <button
              onClick={toggleTorch}
              className={cn(
                'w-11 h-11 rounded-full backdrop-blur-sm flex items-center justify-center',
                torchOn ? 'bg-yellow-400/90' : 'bg-black/50'
              )}
              aria-label="Toggle flashlight"
            >
              {torchOn
                ? <Flashlight className="w-5 h-5 text-black" />
                : <FlashlightOff className="w-5 h-5 text-white" />}
            </button>
          )}

          {/* Flip camera */}
          {showCamera && (
            <button
              onClick={handleFlipCamera}
              className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
              aria-label="Flip camera"
            >
              <SwitchCamera className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scanning overlay: viewfinder & instructions ─────────────────────── */}
      {scanState === 'scanning' && !cameraError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          {/* Viewfinder frame */}
          <div className="relative w-64 h-64">
            {/* Corner brackets */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <span
                key={corner}
                className={cn(
                  'absolute w-8 h-8 border-white',
                  corner === 'tl' && 'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                  corner === 'tr' && 'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                  corner === 'bl' && 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                  corner === 'br' && 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
                )}
                style={{ borderColor: colors.accent }}
              />
            ))}

            {/* Scanning line animation */}
            <div
              className="absolute left-2 right-2 h-0.5 opacity-80 animate-scan-line"
              style={{ backgroundColor: colors.accent }}
            />
          </div>

          <p className="mt-8 text-white/80 text-sm font-medium tracking-wide bg-black/40 backdrop-blur-sm px-5 py-2 rounded-full">
            Point at a box QR code
          </p>
        </div>
      )}

      {/* ── Loading overlay ─────────────────────────────────────────────────── */}
      {scanState === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
          <p className="mt-3 text-white/80 text-sm">Looking up box…</p>
        </div>
      )}

      {/* ── Result / Error slide-up card ────────────────────────────────────── */}
      {showResult && (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 z-30 transition-transform duration-500 ease-out',
            cardVisible ? 'translate-y-0' : 'translate-y-full'
          )}
        >
          {/* Frosted backdrop above card */}
          <div className="absolute inset-x-0 bottom-full h-32 bg-gradient-to-b from-transparent to-black/40 pointer-events-none" />

          <div className="bg-background rounded-t-3xl shadow-2xl max-h-[75dvh] flex flex-col">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 pb-8 pt-2">
              {/* ── Error state ── */}
              {scanState === 'error' && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Box Not Found</p>
                    <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="mt-2 px-6 py-2.5 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Scan Again
                  </button>
                </div>
              )}

              {/* ── Result state ── */}
              {scanState === 'result' && boxResult && (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Box</p>
                      <h2 className="text-2xl font-bold text-foreground">{boxResult.box_number}</h2>
                      {boxResult.lot && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {boxResult.lot.lot_number}
                          {boxResult.lot.type && <span className="ml-1.5 text-xs">· {boxResult.lot.type}</span>}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-1 shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
                        stageBadge(boxResult.current_stage)
                      )}
                    >
                      {stageLabel(boxResult.current_stage)}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Expected', value: boxResult.total_books_expected, icon: <Package className="w-4 h-4" />, color: 'text-foreground' },
                      { label: 'Processable', value: processable, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600' },
                      { label: 'Flagged', value: nonProcessable, icon: <XCircle className="w-4 h-4" />, color: 'text-red-500' },
                    ].map(({ label, value, icon, color }) => (
                      <div key={label} className="flex flex-col items-center gap-1 bg-muted/50 rounded-2xl py-3 px-2">
                        <span className={cn('', color)}>{icon}</span>
                        <span className={cn('text-xl font-bold', color)}>{value}</span>
                        <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Scanned books list */}
                  {totalScanned > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Scanned Books ({totalScanned})
                      </p>
                      <div className="divide-y divide-border rounded-xl overflow-hidden border border-border">
                        {boxResult.books.map((book, i) => (
                          <div key={book.id ?? i} className="flex items-start gap-3 px-3 py-2.5 bg-background">
                            <BookOpen className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate leading-tight">
                                {book.title ?? '(no title)'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{book.isbn}</p>
                            </div>
                            {book.scan_status === 'processable' ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scan again button */}
                  <button
                    onClick={handleReset}
                    className="mt-5 w-full py-3 rounded-2xl text-white text-sm font-semibold"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Scan Another Box
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
