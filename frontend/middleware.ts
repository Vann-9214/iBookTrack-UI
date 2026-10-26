import { NextResponse } from 'next/server'
// Public portfolio demo; the root page redirects to /landing-page.
export function middleware() { return NextResponse.next() }
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'] }
