/** @type {import('next').NextConfig} */

// The backend lives on a separate origin. Allow the browser to connect to it
// (and to itself) but nothing else. In dev we also permit ws: for HMR.
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
const isDev = process.env.NODE_ENV !== 'production'

const connectSrc = ["'self'", apiOrigin, isDev ? 'ws: wss:' : 'wss:']
  .filter(Boolean)
  .join(' ')

// Note: 'unsafe-inline' is required for Next.js's hydration bootstrap and for
// the inline styles used by Recharts/shadcn; 'unsafe-eval' is dev-only (React
// refresh). Everything else is locked to same-origin. img-src allows data:/blob:
// because profile pictures are stored/rendered as base64 data URLs.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // camera=(self) so the in-app QR/ISBN scanner works; mic/geo stay off.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

export default nextConfig
