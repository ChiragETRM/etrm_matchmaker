import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/dashboard/recruiter',
  '/dashboard/candidate',
]

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  '/api/dashboard',
  '/api/jobs', // POST only (creating jobs)
  '/api/apply/one-click',
]

// Routes that should never be accessible in production
const DEVELOPMENT_ONLY_ROUTES = [
  '/api/migrate',
  '/api/test-db',
  '/api/verify-db',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // =========================================================================
  // 1. Security Headers (applied to all responses)
  // =========================================================================

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Enable XSS filter in browsers that support it
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (disable unnecessary features)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Content Security Policy (adjust as needed for your app)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.postmarkapp.com https://challenges.cloudflare.com https://*.supabase.co",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ]
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))

  // =========================================================================
  // 2. Block Development-Only Routes in Production
  // =========================================================================

  if (process.env.NODE_ENV === 'production') {
    for (const route of DEVELOPMENT_ONLY_ROUTES) {
      if (pathname.startsWith(route)) {
        // Allow if correct secret is provided
        const authHeader = request.headers.get('authorization')
        const expectedSecret = process.env.MIGRATE_SECRET || process.env.CRON_SECRET

        if (!expectedSecret || !authHeader || authHeader !== `Bearer ${expectedSecret}`) {
          return NextResponse.json(
            { error: 'This endpoint is not available in production' },
            { status: 403 }
          )
        }
      }
    }
  }

  // =========================================================================
  // 3. Protected Page Routes (redirect to sign in)
  // =========================================================================

  for (const route of PROTECTED_ROUTES) {
    if (pathname.startsWith(route)) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })

      if (!token) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }

      break // Only check once
    }
  }

  // =========================================================================
  // 4. Protected API Routes (return 401)
  // =========================================================================

  // Note: Most API auth is handled in the routes themselves for more granular control
  // This is a backstop for routes that should always require auth

  // POST /api/jobs requires auth (creating jobs)
  if (pathname === '/api/jobs' && request.method === 'POST') {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  // =========================================================================
  // 5. Rate Limiting Headers (informational)
  // =========================================================================

  // Add rate limit headers so clients know their limits
  // Actual enforcement is done in individual routes for flexibility
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Policy', 'See API documentation')
  }

  return response
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
