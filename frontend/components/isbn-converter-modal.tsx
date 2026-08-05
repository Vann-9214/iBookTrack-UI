'use client'

import { useState } from 'react'
import { X, Copy, CheckCircle2, ArrowRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface IsbnConverterModalProps {
  open: boolean
  onClose: () => void
  brand?: string
}

function convertIsbn10To13(isbn10: string): string {
  const cleanIsbn = isbn10.replace(/[^0-9X]/gi, '')
  if (cleanIsbn.length !== 10) return ''

  const base12 = '978' + cleanIsbn.substring(0, 9)
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base12[i], 10)
    sum += i % 2 === 0 ? digit : digit * 3
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return base12 + checkDigit
}

export function IsbnConverterModal({ open, onClose, brand = 'mustang' }: IsbnConverterModalProps) {
  const [isbn10, setIsbn10] = useState('')
  const [copied, setCopied] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  if (!open) return null

  const close = () => {
    if (isClosing) return
    setIsClosing(true)
    window.setTimeout(() => {
      onClose()
      setIsClosing(false)
      setIsbn10('') // clear state on close
      setCopied(false)
    }, 360)
  }

  const isbn13 = convertIsbn10To13(isbn10)
  const isValid10 = isbn10.replace(/[^0-9X]/gi, '').length === 10

  const handleCopy = () => {
    if (isbn13) {
      navigator.clipboard.writeText(isbn13)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Determine theme colors
  const isJaguar = brand.toLowerCase() === 'jaguar'
  const buttonTheme = isJaguar ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25' : 'premium-gradient-ui-card--solid text-white shadow-primary/25'
  const highlightTheme = isJaguar ? 'text-orange-600 border-orange-500/50 bg-orange-500/5' : 'text-primary border-primary/50 bg-primary/5'
  const inputBgTheme = isJaguar ? 'bg-orange-500/5 border-orange-500/20 focus:border-orange-500 focus:ring-orange-500/20' : 'bg-primary/5 border-primary/20 focus:border-primary focus:ring-primary/20'
  const arrowBgTheme = isJaguar ? 'bg-orange-100 text-orange-500 border-orange-200' : 'bg-primary/10 text-primary border-primary/20'
  const lineTheme = isJaguar ? 'border-orange-500/20' : 'border-primary/20'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => close()}>
      <div className="w-full max-w-[24rem]" data-theme={brand} onClick={(e) => e.stopPropagation()}>
        <div data-modal-origin-surface className={cn("premium-gradient-ui-card premium-gradient-ui-card--static border rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 relative", isClosing ? 'animate-modal-origin-out' : 'animate-modal-origin')}>
          <div className="premium-gradient-ui-card__glow" />

          {/* Close button */}
          <button
            onClick={close}
            className="absolute right-5 top-5 z-20 text-muted-foreground hover:text-foreground transition-colors bg-white/50 dark:bg-black/20 p-1.5 rounded-full border border-border/50"
          >
            <X className="h-4 w-4" />
          </button>

          <div className={cn("relative z-10 flex items-center gap-4 pb-5 mb-5 border-b", lineTheme)}>
            <div className="premium-gradient-ui-card__icon w-10 h-10 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="premium-gradient-ui-card__eyebrow">Utility</p>
              <h3 className="text-lg font-bold text-foreground leading-tight">ISBN Converter</h3>
            </div>
          </div>

          {/* Body */}
          <div className="relative z-10 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                ISBN-10
              </label>
              <input
                type="text"
                value={isbn10}
                onChange={(e) => {
                  setIsbn10(e.target.value)
                  setCopied(false)
                }}
                placeholder="e.g. 0306406152"
                className={cn("w-full px-4 py-3 rounded-xl border backdrop-blur-sm text-sm ring-offset-background focus:outline-none focus:ring-2 transition shadow-sm", inputBgTheme)}
              />
            </div>

            <div className="flex justify-center py-1">
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-full border shadow-sm", arrowBgTheme)}>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                <span>ISBN-13 Result</span>
                {copied && <span className="text-[10px] text-primary flex items-center gap-1 font-semibold"><CheckCircle2 className="h-3 w-3" /> Copied!</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={isValid10 ? isbn13 : ''}
                  placeholder="Result will appear here"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border text-sm font-semibold pr-12 shadow-sm transition",
                    !isValid10 && isbn10.length > 0 ? "border-destructive/50 text-destructive bg-destructive/5" : isValid10 ? cn(highlightTheme) : cn(inputBgTheme)
                  )}
                />
                <button
                  onClick={handleCopy}
                  disabled={!isValid10}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors border",
                    isValid10 ? "text-foreground bg-white hover:bg-gray-50 shadow-sm border-border" : "text-muted-foreground/30 bg-transparent border-transparent cursor-not-allowed"
                  )}
                  title="Copy ISBN-13"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {!isValid10 && isbn10.length > 0 && (
                <p className="text-xs font-medium text-destructive mt-2">Please enter a valid 10-digit ISBN.</p>
              )}
            </div>
            
            <button
              onClick={close}
              className={cn(
                "w-full px-4 py-3 text-sm rounded-xl font-bold shadow-md transition hover:-translate-y-0.5 active:translate-y-0 mt-4 flex items-center justify-center",
                buttonTheme
              )}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
