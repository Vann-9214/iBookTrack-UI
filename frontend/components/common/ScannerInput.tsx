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
    ? 'border-emerald-200/80 bg-emerald-50 ring-emerald-100/70'
    : 'border-blue-200/80 bg-blue-50 ring-blue-100/70'
  const iconTheme = isJaguar
    ? 'bg-primary shadow-emerald-500/25'
    : 'bg-primary shadow-blue-500/25'
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
    <div className={cn('relative w-full overflow-hidden rounded-2xl border-2 p-3 shadow-sm ring-1 sm:p-4', isWarehouse ? cardTheme : 'border-primary/30 bg-card ring-primary/10')}>
      {isWarehouse && <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-white/30 blur-xl" />}
      <div className="relative mb-3 flex items-center gap-2.5">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', isWarehouse ? `${iconTheme} text-white shadow-lg` : 'bg-primary/10 text-primary')}>
          <Barcode className={isWarehouse ? 'h-4 w-4' : 'w-3.5 h-3.5'} />
        </div>
        <div>
          <label className={cn('text-[11px] font-bold uppercase tracking-wider', isWarehouse ? textTheme : 'text-muted-foreground')}>
            Barcode / ISBN Scanner
          </label>
          {isWarehouse && <p className={cn('text-[11px] font-medium leading-tight', isJaguar ? 'text-primary/80' : 'text-primary/80')}>Scan a book to add it to this session.</p>}
        </div>
      </div>
      
      <div className="relative group">
        <div className={cn('pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1 transition duration-300 group-focus-within:animate-pulse', isWarehouse ? `${isJaguar ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}` : 'bg-primary/10 text-primary')}>
          <Barcode className="h-3.5 w-3.5" />
        </div>
        
        <Input
          type="text"
          placeholder="Scan barcode or ISBN here..."
          value={scanInput}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          className={cn('h-9 rounded-xl border-2 border-primary/20 pl-10 placeholder:text-slate-400/70 text-base shadow-inner ring-1 ring-black/5 transition duration-300 focus-visible:border-primary/60 focus-visible:shadow-[0_0_15px_rgba(var(--primary),0.2)] sm:h-10 sm:text-sm', isWarehouse ? 'bg-white/85 backdrop-blur-[2px]' : 'bg-background/50')}
          autoFocus
        />
      </div>
      
      <div className="mt-2.5 flex items-center gap-2">
        <span className={cn('text-[11px] font-medium', isWarehouse ? (isJaguar ? 'text-emerald-700/80' : 'text-blue-700/80') : 'text-muted-foreground')}>Press</span>
        <kbd className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold shadow-sm', isWarehouse ? (isJaguar ? 'border-emerald-200 bg-white/80 text-emerald-700' : 'border-blue-200 bg-white/80 text-blue-700') : 'border-border bg-muted text-foreground')}>
          ⏎ Enter
        </kbd>
        <span className={cn('text-[11px] font-medium', isWarehouse ? (isJaguar ? 'text-emerald-700/80' : 'text-blue-700/80') : 'text-muted-foreground')}>{isWarehouse ? 'to scan this book' : 'to scan and process the book'}</span>
      </div>
    </div>
  )
}
