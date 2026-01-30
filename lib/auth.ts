import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { Adapter } from 'next-auth/adapters'
import { prisma } from './prisma'

// Wrap Prisma adapter so deleteSession doesn't throw when session already removed (e.g. signOut race).
function wrapAdapter(adapter: Adapter): Adapter {
  if (!adapter.deleteSession) return adapter
  return {
    ...adapter,
    async deleteSession(sessionToken) {
      try {
        return await adapter.deleteSession!(sessionToken)
      } catch (e: unknown) {
        const err = e as { code?: string }
        if (err?.code === 'P2025') return null // Prisma "Record not found"
        throw e
      }
    },
  }
}
import { verifyPassword } from './password'
import { checkLoginLimit } from './auth-rate-limit'

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
const hasGoogle = !!(googleClientId && googleClientSecret)

// Validate required configuration (at least one auth method)
if (!authSecret) {
  throw new Error('AUTH_SECRET or NEXTAUTH_SECRET environment variable is required')
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
  console.log('[NextAuth Config] Google:', hasGoogle ? 'enabled' : 'disabled (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable)')
}

// Use state-only for Google in serverless to avoid PKCE cookie parsing issues
// (pkceCodeVerifier cookie can be lost between redirects on Vercel). Still secure with client_secret.
const googleProvider = hasGoogle
  ? Google({
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        },
      },
      checks: ['state'],
    })
  : null

const credentialsProvider = Credentials({
  id: 'credentials',
  name: 'Email and Password',
  credentials: {
    token: { label: 'Token', type: 'text' },
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials) return null

    const token = credentials.token as string | undefined
    const email = credentials.email as string | undefined
    const password = credentials.password as string | undefined

    // OTP verification token flow
    if (token && token.length > 0) {
      const record = await prisma.otpVerificationToken.findUnique({
        where: { token },
      })
      if (!record || record.expiresAt < new Date()) {
        if (record) await prisma.otpVerificationToken.delete({ where: { id: record.id } })
        return null
      }
      const user = await prisma.user.findUnique({ where: { id: record.userId } })
      await prisma.otpVerificationToken.delete({ where: { id: record.id } })
      if (!user) return null
      return { id: user.id, email: user.email, name: user.name, image: user.image }
    }

    // Email + password flow
    if (email && password) {
      const emailNorm = email.trim().toLowerCase()
      // Rate limit by email (IP not available in authorize)
      const limit = checkLoginLimit(`email:${emailNorm}`)
      if (!limit.allowed) return null

      const user = await prisma.user.findUnique({
        where: { email: emailNorm },
      })
      if (!user?.passwordHash) return null
      const valid = await verifyPassword(password, user.passwordHash)
      if (!valid) return null
      return { id: user.id, email: user.email, name: user.name, image: user.image }
    }

    return null
  },
})

const providers = googleProvider
  ? [credentialsProvider, googleProvider]
  : [credentialsProvider]

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: wrapAdapter(PrismaAdapter(prisma)),
  secret: authSecret,
  basePath: '/api/auth',
  providers,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect errors to sign-in page
  },
  callbacks: {
    async session({ session, user, token }: { session: any; user?: any; token?: any }) {
      // Handle database adapter sessions (user is provided)
      if (user && session?.user) {
        session.user.id = user.id
        // Include additional profile data in session
        if (user.givenName) session.user.givenName = user.givenName
        if (user.familyName) session.user.familyName = user.familyName
        if (user.locale) session.user.locale = user.locale
        if (user.googleSub) session.user.googleSub = user.googleSub
      }
      // Handle JWT sessions (token is provided, fallback)
      else if (token && session?.user) {
        session.user.id = token.sub || token.id
        if (token.givenName) session.user.givenName = token.givenName
        if (token.familyName) session.user.familyName = token.familyName
        if (token.locale) session.user.locale = token.locale
        if (token.googleSub) session.user.googleSub = token.googleSub
      }
      return session
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Ensure baseUrl is properly set
      const effectiveBaseUrl = baseUrl || authUrl
      
      // Handle relative URLs (e.g. /dashboard or /dashboard/candidate from callbackUrl form param)
      if (url.startsWith('/')) {
        const target = `${effectiveBaseUrl}${url}`
        if (!isProduction) {
          console.log('[NextAuth redirect] relative url ->', target, 'baseUrl:', effectiveBaseUrl)
        }
        return target
      }
      
      // Handle absolute URLs from same origin
      try {
        const urlObj = new URL(url)
        const baseUrlObj = new URL(effectiveBaseUrl)
        if (urlObj.origin === baseUrlObj.origin) {
          if (!isProduction) console.log('[NextAuth redirect] same-origin ->', url)
          return url
        }
      } catch {
        // Invalid URL, fall through to default
      }
      
      if (!isProduction) console.log('[NextAuth redirect] default baseUrl ->', effectiveBaseUrl)
      return effectiveBaseUrl
    },
    async signIn({ user, account, profile }) {
      // Allow all sign-ins - you can add additional checks here if needed
      return true
    },
    // Capture and store all available Google profile data
    async jwt({ token, account, profile, user }) {
      // On first sign in, profile and account are available
      if (account && profile) {
        // Store all available profile data
        token.googleSub = profile.sub || account.providerAccountId
        token.givenName = profile.given_name
        token.familyName = profile.family_name
        token.locale = profile.locale
        token.picture = profile.picture
        token.emailVerified = profile.email_verified
        
        // Store complete profile data as JSON
        token.profileData = JSON.stringify({
          sub: profile.sub,
          email: profile.email,
          email_verified: profile.email_verified,
          name: profile.name,
          given_name: profile.given_name,
          family_name: profile.family_name,
          picture: profile.picture,
          locale: profile.locale,
          // Include any additional fields that might be present
          ...profile,
        })
      }
      
      // If user is provided (database adapter), include user ID
      if (user) {
        token.id = user.id
      }
      
      return token
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
  // Note: Let NextAuth handle PKCE cookies automatically to avoid parsing errors
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
    // Remove custom pkceCodeVerifier configuration - let NextAuth handle it automatically
    // Custom configuration can cause parsing errors
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
  // Event handlers for better error tracking and data storage
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Update user with all available Google profile data
      if (account?.provider === 'google' && user?.id && profile) {
        try {
          // Fetch current user to get existing emailVerified value
          const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { emailVerified: true, jobAlertPolicyAgreed: true },
          })

          const profileDataJson = JSON.stringify({
            sub: profile.sub,
            email: profile.email,
            email_verified: profile.email_verified,
            name: profile.name,
            given_name: profile.given_name,
            family_name: profile.family_name,
            picture: profile.picture,
            locale: profile.locale,
            // Include any additional fields that might be present
            ...profile,
          })

          // Check if policy agreement should be set (will be handled by API endpoint after redirect)
          // For now, we'll update the user profile data
          await prisma.user.update({
            where: { id: user.id },
            data: {
              givenName: profile.given_name || null,
              familyName: profile.family_name || null,
              locale: profile.locale || null,
              googleSub: profile.sub || account.providerAccountId || null,
              profileData: profileDataJson,
              // Update basic fields if they're missing or changed
              name: profile.name || user.name || null,
              image: profile.picture || user.image || null,
              emailVerified: profile.email_verified 
                ? new Date() 
                : currentUser?.emailVerified || null,
              // Don't update jobAlertPolicyAgreed here - it will be set via API endpoint
            },
          })
        } catch (error) {
          // Log error but don't fail sign-in
          console.error('[NextAuth] Error updating user profile data:', error)
        }
      }
    },
    async signOut() {
      // Clean up on sign out (optional)
      // Note: NextAuth v5 signOut event doesn't provide session parameter
    },
  },
})
