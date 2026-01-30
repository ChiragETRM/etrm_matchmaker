import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
]

function hasSessionCookie(req: NextRequest): boolean {
  const cookieHeader = req.headers.get('cookie') || ''
  return SESSION_COOKIE_NAMES.some((name) =>
    cookieHeader.includes(`${name}=`) && !cookieHeader.includes(`${name}=;`)
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect dashboard routes: redirect unauthenticated to sign-in with callbackUrl
  if (pathname.startsWith('/dashboard')) {
    if (!hasSessionCookie(req)) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
}
