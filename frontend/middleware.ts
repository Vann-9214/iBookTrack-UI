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
  '/endorsement',
  '/scan',
  '/settings',
  '/notifications'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const isProtectedPath = protectedPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  )

  const token = request.cookies.get('access_token')?.value

  // If trying to access a protected route without a token, kick to login
  if (isProtectedPath) {
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  } 
  
  // If user already has a token and tries to access login, register, or root path, send them to Dashboard
  const isAuthPath = pathname === '/login' || pathname === '/register' || pathname === '/'
  if (isAuthPath && token) {
    const url = request.nextUrl.clone()
    url.pathname = '/Dashboard'
    return NextResponse.redirect(url)
  }

  // If user accesses root path without a token, send them to login
  if (pathname === '/' && !token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|login|register|forgot-password|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
