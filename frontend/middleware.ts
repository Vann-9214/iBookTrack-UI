import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = [
  '/Dashboard',
  '/warehouse',
  '/inventory',
  '/reports',
  '/storage',
  '/locator',
  '/transmission',
  '/admin',
  '/checkpoints',
  '/cut',
  '/intake',
  '/qa',
  '/scan',
  '/settings',
  '/notifications'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const isProtectedPath = protectedPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  )

  if (isProtectedPath) {
    const token = request.cookies.get('access_token')?.value
    
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|login|register|forgot-password|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
