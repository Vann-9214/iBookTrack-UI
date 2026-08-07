import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { ScanFormat } from '@/components/QrScanner'
import type { ScanResult } from '../types/qr-scanner.types'
import { parseQr } from '../utils/qr-scanner.helpers'
import { fetchIsbnDetails } from '../services/qr-scanner.service'

export function useQrScanner() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  const clearScanResult = useCallback(() => {
    setScanResult(null)
  }, [])

  const handleScan = useCallback(async (text: string, format: ScanFormat) => {
    if (format === 'barcode') {
      const isbn = text.replace(/[^0-9a-zA-Z]/g, '')

      // Show card immediately in loading state
      setScanResult({
        kind:            'barcode',
        isbn,
        title:           '—',
        author:          '—',
        lot:             '—',
        box:             '—',
        bookType:        '—',
        status:          '',
        rejectionReason: '',
        loading:         true,
        notFound:        false,
      })
      toast.success('Barcode scanned', { description: isbn })

      // Fetch details from the backend
      try {
        const json = await fetchIsbnDetails(isbn)

        if (json.success && json.book) {
          const b = json.book
          const rawStatus = b.scan_status ?? ''
          const status = rawStatus === 'processable' ? 'P' : rawStatus === 'non_processable' ? 'NP' : ''
          setScanResult({
            kind:            'barcode',
            isbn,
            title:           b.title && b.title !== 'Unknown' ? b.title : '—',
            author:          b.author || '—',
            lot:             b.lot_number || '—',
            box:             b.box_number || '—',
            bookType:        b.book_type || '—',
            status,
            rejectionReason: b.rejection_reason || '',
            isResolved: b.is_resolved || false,
            loading:         false,
            notFound:        false,
          })
        } else {
          setScanResult((prev) => prev?.kind === 'barcode'
            ? { ...prev, loading: false, notFound: true }
            : prev)
          toast.error('ISBN not found', { description: json.message || isbn })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setScanResult((prev) => prev?.kind === 'barcode'
          ? { ...prev, loading: false, notFound: true }
          : prev)
        toast.error('Lookup failed', { description: msg })
      }
    } else {
      // QR = pipe-delimited box label — show immediately, then fill titles in background
      const data = parseQr(text)
      setScanResult(data)
      toast.success('QR code scanned', { description: `Box ${data.box} · Lot ${data.lot}` })

      // Fetch titles for every ISBN in the QR in parallel
      if (data.books.length > 0) {
        const results = await Promise.allSettled(
          data.books.map((book) => fetchIsbnDetails(book.isbn))
        )
        setScanResult((prev) => {
          if (!prev || prev.kind !== 'qr') return prev
          const updatedBooks = prev.books.map((book, i) => {
            const res = results[i]
            if (res.status === 'fulfilled' && res.value?.success && res.value?.book) {
              const b = res.value.book
              return {
                ...book,
                title:           b.title && b.title !== 'Unknown' ? b.title : '—',
                author:          b.author || '—',
                scanStatus:      b.scan_status === 'processable' ? 'P' : 'NP',
                rejectionReason: b.rejection_reason || '',
                isResolved:      b.is_resolved || false,
              }
            }
            return book
          })
          return { ...prev, books: updatedBooks }
        })
      }
    }
  }, [])

  return {
    scanResult,
    handleScan,
    clearScanResult,
  }
}
