import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { BrandProvider } from '@/hooks/use-brand'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { ModalOriginTracker } from '@/components/modal-origin-tracker'
import { UserProvider } from '@/hooks/use-user'
import './globals.css'


export const metadata: Metadata = {
  title: 'iBookTrack - Tool',
  description: 'Warehouse management command center for real-time pipeline tracking, transmission monitoring, and checkpoint management.',
  icons: {
    icon: '/ibooktrack_final_cool_logo.png',
    apple: '/ibooktrack_final_cool_logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <UserProvider>
            <BrandProvider>
              <ModalOriginTracker />
              {children}
            </BrandProvider>
          </UserProvider>
          <Toaster />
          <SonnerToaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
