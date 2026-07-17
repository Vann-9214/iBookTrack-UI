import { Loader2 } from 'lucide-react'
import { useBrand } from '@/hooks/use-brand'

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  const { colors } = useBrand()
  
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm transition-opacity duration-200">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 mb-4">
         <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.sidebar }} />
      </div>
      <p className="text-sm font-bold tracking-widest uppercase opacity-70 animate-pulse" style={{ color: colors.sidebar }}>
        {text}
      </p>
    </div>
  )
}
