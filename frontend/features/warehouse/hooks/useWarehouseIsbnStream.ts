'use client'

import { useEffect, useRef, useState } from 'react'
import { getApiBaseUrl } from '@/lib/auth-api'

export function useWarehouseIsbnStream(sessionActive: boolean) {
  const sseRef = useRef<EventSource | null>(null)
  const [streamIsbn, setStreamIsbn] = useState<string | null>(null)
  const [streamLoading, setStreamLoading] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)

  const stopStream = () => {
    sseRef.current?.close()
    sseRef.current = null
    setStreamLoading(false)
    setStreamError(null)
  }

  const startStream = () => {
    stopStream()
    const baseUrl = getApiBaseUrl()
    const es = new EventSource(`${baseUrl}/api/warehouse/isbn-stream`, {
      withCredentials: true,
    })
    es.addEventListener('connected', () => console.log('📡 ISBN stream connected'))
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setStreamIsbn(data.isbn ?? event.data)
      } catch {
        setStreamIsbn(event.data)
      }
      setStreamLoading(false)
    }
    es.onerror = () => {
      console.warn('ISBN stream error — will retry automatically')
      setStreamError('ISBN stream error')
    }
    sseRef.current = es
  }

  useEffect(() => {
    if (sessionActive) {
      setStreamLoading(true)
      startStream()
    } else {
      stopStream()
    }
    return () => stopStream()
  }, [sessionActive])

  return { streamIsbn, streamLoading, streamError, startStream, stopStream }
}
