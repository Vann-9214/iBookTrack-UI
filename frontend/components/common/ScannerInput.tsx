'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Barcode } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ScannerInputProps {
  onScan: (isbn: string) => void
  brand?: 'mustang' | 'jaguar'
}

export function ScannerInput({ onScan, brand }: ScannerInputProps) {
  const [scanInput, setScanInput] = useState('')
  const isWarehouse = Boolean(brand)
  const isJaguar = brand === 'jaguar'
  const cardTheme = isJaguar
    ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-card to-emerald-100/60 ring-emerald-100/70'
    : 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-card to-indigo-100/60 ring-blue-100/70'
  const iconTheme = isJaguar
    ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25'
    : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25'
  const textTheme = isJaguar ? 'text-emerald-700' : 'text-blue-700'

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
    <div className={cn('relative w-full overflow-hidden rounded-2xl border-2 p-4 shadow-sm ring-1 sm:p-5', isWarehouse ? cardTheme : 'border-primary/30 bg-card ring-primary/10')}>
      {isWarehouse && <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-2xl" />}
      <div className="relative mb-4 flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', isWarehouse ? `${iconTheme} text-white shadow-lg` : 'bg-primary/10 text-primary')}>
          <Barcode className={isWarehouse ? 'h-5 w-5' : 'w-4 h-4'} />
        </div>
        <div>
          <label className={cn('text-[11px] font-bold uppercase tracking-wider', isWarehouse ? textTheme : 'text-muted-foreground')}>
            Barcode / ISBN Scanner
          </label>
          {isWarehouse && <p className={cn('mt-0.5 text-[11px] font-medium', isJaguar ? 'text-emerald-600/80' : 'text-blue-600/80')}>Scan a book to add it to this session.</p>}
        </div>
      </div>
      
      <div className="relative group">
        <div className={cn('pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1.5 transition-all duration-300 group-focus-within:animate-pulse', isWarehouse ? `${isJaguar ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}` : 'bg-primary/10 text-primary')}>
          <Barcode className="h-5 w-5" />
        </div>
        
        <Input
          type="text"
          placeholder="Scan barcode or ISBN here..."
          value={scanInput}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          className={cn('h-12 rounded-xl border-2 border-primary/20 pl-12 text-base shadow-inner ring-1 ring-black/5 transition-all duration-300 focus-visible:border-primary/60 focus-visible:shadow-[0_0_15px_rgba(var(--primary),0.2)] sm:h-14 sm:text-lg', isWarehouse ? 'bg-white/85 backdrop-blur-sm' : 'bg-background/50')}
          autoFocus
        />
      </div>
      
      <div className="mt-3 flex items-center gap-2">
        <span className={cn('text-xs font-medium', isWarehouse ? (isJaguar ? 'text-emerald-700/80' : 'text-blue-700/80') : 'text-muted-foreground')}>Press</span>
        <kbd className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-bold shadow-sm', isWarehouse ? (isJaguar ? 'border-emerald-200 bg-white/80 text-emerald-700' : 'border-blue-200 bg-white/80 text-blue-700') : 'border-border bg-muted text-foreground')}>
          ⏎ Enter
        </kbd>
        <span className={cn('text-xs font-medium', isWarehouse ? (isJaguar ? 'text-emerald-700/80' : 'text-blue-700/80') : 'text-muted-foreground')}>{isWarehouse ? 'to scan this book' : 'to scan and process the book'}</span>
      </div>
    </div>
  )
}
