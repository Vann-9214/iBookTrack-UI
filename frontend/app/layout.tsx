import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: 'InnoTrack - iBook Dashboard',
  description: 'Warehouse management command center for real-time pipeline tracking, transmission monitoring, and checkpoint management.',
  icons: {
    icon: '/iBookTrack_logoN.png',
    apple: '/iBookTrack_logoN.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
