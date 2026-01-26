import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req: any) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Protected routes that require authentication
  // Include the main /dashboard page as well as subpaths
  const protectedPaths = ['/dashboard', '/post-job']

  const isProtected = protectedPaths.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  )

  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  // Match both exact /dashboard and all subpaths
  matcher: ['/dashboard', '/dashboard/:path*', '/post-job', '/post-job/:path*'],
}
