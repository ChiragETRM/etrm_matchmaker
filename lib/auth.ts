import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

// NextAuth v5 reads AUTH_SECRET directly from process.env for CSRF token
// validation and cookie signing. If only NEXTAUTH_SECRET is set, sync it
// to AUTH_SECRET so internal CSRF handling uses the correct secret.
// This MUST happen before NextAuth() is called.
if (!process.env.AUTH_SECRET && process.env.NEXTAUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET
}

const authSecret = process.env.AUTH_SECRET
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

// Validate required configuration
if (!authSecret) {
  throw new Error('AUTH_SECRET or NEXTAUTH_SECRET environment variable is required')
}
if (!googleClientId || !googleClientSecret) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required')
}

// Determine AUTH_URL - NextAuth v5 uses this via environment variables automatically
// Priority: AUTH_URL > NEXTAUTH_URL > NEXT_PUBLIC_APP_URL > auto-detect
function getAuthUrl(): string {
  // Explicit AUTH_URL takes highest priority
  if (process.env.AUTH_URL) {
    const url = process.env.AUTH_URL.trim()
    // Ensure it doesn't end with a slash
    return url.endsWith('/') ? url.slice(0, -1) : url
  }
  
  // Fallback to NEXTAUTH_URL
  if (process.env.NEXTAUTH_URL) {
    const url = process.env.NEXTAUTH_URL.trim()
    return url.endsWith('/') ? url.slice(0, -1) : url
  }
  
  // Fallback to NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = process.env.NEXT_PUBLIC_APP_URL.trim()
    return url.endsWith('/') ? url.slice(0, -1) : url
  }
  
  // Vercel production - use VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Default for local development
  return 'http://localhost:3000'
}

const authUrl = getAuthUrl()
const isProduction = process.env.NODE_ENV === 'production'

// Log configuration in development to help debug
if (!isProduction) {
  console.log('[NextAuth Config] AUTH_URL:', authUrl)
  console.log('[NextAuth Config] AUTH_SECRET:', authSecret ? '***set***' : 'MISSING')
  console.log('[NextAuth Config] GOOGLE_CLIENT_ID:', googleClientId ? '***set***' : 'MISSING')
  console.log('[NextAuth Config] GOOGLE_CLIENT_SECRET:', googleClientSecret ? '***set***' : 'MISSING')
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: authSecret,
  // Explicitly set the base URL for NextAuth
  basePath: '/api/auth',
  // Note: NextAuth v5 automatically detects URL from AUTH_URL, NEXTAUTH_URL, or VERCEL_URL env vars
  // trustHost: true enables automatic URL detection from request headers
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      // Ensure proper redirect handling
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect errors to sign-in page
  },
  callbacks: {
    async session({ session, user, token }: { session: any; user?: any; token?: any }) {
      // Handle database adapter sessions (user is provided)
      if (user && session?.user) {
        session.user.id = user.id
      }
      // Handle JWT sessions (token is provided, fallback)
      else if (token && session?.user) {
        session.user.id = token.sub || token.id
      }
      return session
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Ensure baseUrl is properly set
      const effectiveBaseUrl = baseUrl || authUrl
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        return `${effectiveBaseUrl}${url}`
      }
      
      // Handle absolute URLs from same origin
      try {
        const urlObj = new URL(url)
        const baseUrlObj = new URL(effectiveBaseUrl)
        if (urlObj.origin === baseUrlObj.origin) {
          return url
        }
      } catch {
        // Invalid URL, fall through to default
      }
      
      // Default to baseUrl
      return effectiveBaseUrl
    },
    async signIn({ user, account, profile }) {
      // Allow all sign-ins - you can add additional checks here if needed
      return true
    },
  },
  // Trust host for proper URL detection (especially on Vercel)
  trustHost: true,
  // Session configuration
  session: {
    strategy: 'database', // Use database sessions for better reliability
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  // Cookie configuration with proper domain handling
  cookies: {
    sessionToken: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        // Don't set domain - let browser handle it automatically
        // This prevents issues with subdomains and localhost
      },
    },
    callbackUrl: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    csrfToken: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        // Using __Secure- instead of __Host- for better compatibility
        // __Host- requires exact domain match which can fail on Vercel preview deployments
      },
    },
    pkceCodeVerifier: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        maxAge: 60 * 15, // 15 minutes
      },
    },
  },
  // Enable debug logging in development
  debug: !isProduction,
  // Event handlers for better error tracking
  events: {
    async signIn({ user, account, isNewUser }) {
      // Log successful sign-ins (optional)
    },
    async signOut() {
      // Clean up on sign out (optional)
      // Note: NextAuth v5 signOut event doesn't provide session parameter
    },
  },
})
