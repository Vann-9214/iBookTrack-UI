import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { BoxItem } from '../types/checkpoints.types'

export function useCheckpointScanner(
  boxes: BoxItem[],
  openBoxDetails: (box: BoxItem) => Promise<void>
) {
  const { toast } = useToast()

  const [scanInput, setScanInput] = useState('')
  const [highlightBox, setHighlightBox] = useState<string | null>(null)

  const handleScan = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const q = scanInput.trim().toLowerCase()
    if (!q) return
    const match = boxes.find(
      (b) =>
        b.box_number.toLowerCase() === q ||
        b.box_number.toLowerCase().includes(q)
    )
    if (match) {
      setHighlightBox(match.id)
      setTimeout(() => setHighlightBox(null), 4000)
      document.getElementById(`box-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await openBoxDetails(match)
    } else {
      toast({ title: `Box "${scanInput}" not found` })
    }
    setScanInput('')
  }, [scanInput, boxes, openBoxDetails, toast])

  return {
    scanInput,
    setScanInput,
    highlightBox,
    handleScan,
  }
}
