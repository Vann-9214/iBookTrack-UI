'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Brand = 'mustang' | 'jaguar'

export const BRAND_COLORS: Record<Brand, { sidebar: string; accent: string; label: string }> = {
  mustang: { sidebar: '#1658EB', accent: '#1658EB', label: 'Mustang' },
  jaguar:  { sidebar: '#16a34a', accent: '#16a34a', label: 'Jaguar' },
}

type BrandContextValue = {
  brand: Brand
  setBrand: (b: Brand) => void
  colors: typeof BRAND_COLORS.mustang
}

const BrandContext = createContext<BrandContextValue | null>(null)

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<Brand>('mustang')

  useEffect(() => {
    const stored = window.localStorage.getItem('ibooktrack_brand') as Brand | null
    if (stored === 'mustang' || stored === 'jaguar') {
      setBrandState(stored)
    }
  }, [])

  const setBrand = (b: Brand) => {
    setBrandState(b)
    window.localStorage.setItem('ibooktrack_brand', b)
  }

  return (
    <BrandContext.Provider value={{ brand, setBrand, colors: BRAND_COLORS[brand] }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
