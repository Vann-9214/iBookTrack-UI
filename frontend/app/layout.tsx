import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { BrandProvider } from '@/hooks/use-brand'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { IdleTimeout } from '@/components/idle-timeout'
import { UserProvider } from '@/hooks/use-user'
import './globals.css'

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: 'InnoTrack - iBook Dashboard',
  description: 'Warehouse management command center for real-time pipeline tracking, transmission monitoring, and checkpoint management.',
  icons: {
    icon: '/iBookTrack_logoN.png',
    apple: '/iBookTrack_logoN.png',
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
      <body className={`${_inter.variable} ${_playfair.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <UserProvider>
            <BrandProvider>
              {children}
            </BrandProvider>
          </UserProvider>
          <Toaster />
          <SonnerToaster position="bottom-right" richColors />
          <IdleTimeout />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
