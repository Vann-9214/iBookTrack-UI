'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Barcode } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ScannerInputProps {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9a-zA-Z]/g, '')
    setScanInput(value)
  }

  return (
    <div className="bg-card rounded-2xl border-2 border-primary/30 shadow-sm ring-1 ring-primary/10 p-4 sm:p-5 w-full">
      <div className="flex items-center gap-2 mb-3">
        <Barcode className="w-4 h-4 text-muted-foreground" />
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Barcode / ISBN Scanner
        </label>
      </div>
      
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary/10 rounded-lg p-1.5 text-primary transition-all duration-300 group-focus-within:animate-pulse">
          <Barcode className="w-5 h-5" />
        </div>
        
        <Input
          type="text"
          placeholder="Scan barcode or ISBN here..."
          value={scanInput}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          className="pl-14 h-12 sm:h-14 text-lg rounded-xl border-2 border-primary/20 focus-visible:border-primary/60 bg-background/50 ring-1 ring-black/5 shadow-inner transition-all duration-300 focus-visible:shadow-[0_0_15px_rgba(var(--primary),0.2)]"
          autoFocus
        />
      </div>
      
      <div className="mt-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          Press 
          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-semibold text-foreground">
            ⏎ Enter
          </span> 
          to scan and process the book
        </p>
      </div>
    </div>
  )
}
