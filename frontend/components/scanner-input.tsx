'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Barcode } from 'lucide-react'

interface ScannerInputProps {
  onScan: (isbn: string) => void
}

export function ScannerInput({ onScan }: ScannerInputProps) {
  const [scanInput, setScanInput] = useState('')

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanInput.trim()) {
      onScan(scanInput)
      setScanInput('')
    }
  }

  return (
    <div className="w-full">
      <label className="text-sm font-medium text-muted-foreground mb-3 block">
        Barcode / ISBN Scanner
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
          <Barcode className="w-6 h-6" />
        </div>
        <Input
          type="text"
          placeholder="Scan barcode or ISBN here..."
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-14 py-6 text-lg border-2 border-primary/50 focus:border-primary bg-card"
          autoFocus
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to scan and process the book
      </p>
    </div>
  )
}
