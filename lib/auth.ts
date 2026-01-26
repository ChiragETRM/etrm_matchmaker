import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

// #region agent log
console.error('[AUTH DEBUG] NextAuth config init - checking env vars', {
  hasAuthSecret: !!process.env.AUTH_SECRET,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  hasAuthUrl: !!process.env.AUTH_URL,
  hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
  hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  authUrl: process.env.AUTH_URL || 'NOT_SET',
  hypothesisId: 'A,B,C'
});
fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:6',message:'NextAuth config init - checking env vars',data:{hasAuthSecret:!!process.env.AUTH_SECRET,hasNextAuthSecret:!!process.env.NEXTAUTH_SECRET,hasAuthUrl:!!process.env.AUTH_URL,hasGoogleClientId:!!process.env.GOOGLE_CLIENT_ID,hasGoogleClientSecret:!!process.env.GOOGLE_CLIENT_SECRET,authUrl:process.env.AUTH_URL||'NOT_SET'},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'A,B,C'})}).catch(()=>{});
// #endregion

const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
// AUTH_URL is required for NextAuth v5 in production
// Fallback to NEXT_PUBLIC_APP_URL or construct from VERCEL_URL if available
const authUrl = process.env.AUTH_URL || 
  process.env.NEXT_PUBLIC_APP_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

// #region agent log
console.error('[AUTH DEBUG] Env vars extracted - before NextAuth init', {
  authSecretExists: !!authSecret,
  authSecretLength: authSecret?.length || 0,
  googleClientIdExists: !!googleClientId,
  googleClientIdLength: googleClientId?.length || 0,
  googleClientSecretExists: !!googleClientSecret,
  googleClientSecretLength: googleClientSecret?.length || 0,
  authUrlExists: !!authUrl,
  authUrlValue: authUrl || 'NOT_SET',
  hypothesisId: 'A,B,C'
});
fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:18',message:'Env vars extracted - before NextAuth init',data:{authSecretExists:!!authSecret,authSecretLength:authSecret?.length||0,googleClientIdExists:!!googleClientId,googleClientIdLength:googleClientId?.length||0,googleClientSecretExists:!!googleClientSecret,googleClientSecretLength:googleClientSecret?.length||0,authUrlExists:!!authUrl,authUrlValue:authUrl||'NOT_SET'},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'A,B,C'})}).catch(()=>{});
// #endregion

// Validate required configuration
if (!authSecret) {
  throw new Error('AUTH_SECRET or NEXTAUTH_SECRET environment variable is required')
}
if (!googleClientId || !googleClientSecret) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required')
}

let nextAuthConfig: any
try {
  nextAuthConfig = {
    adapter: PrismaAdapter(prisma),
    // Support both AUTH_SECRET (v5) and NEXTAUTH_SECRET (v4 compat)
    secret: authSecret,
    providers: [
      Google({
        clientId: googleClientId!,
        clientSecret: googleClientSecret!,
      }),
    ],
    pages: {
      signIn: '/auth/signin',
    },
    callbacks: {
      session({ session, user }: { session: any; user: any }) {
        // Add user id to session for convenience
        if (session.user) {
          session.user.id = user.id
        }
        return session
      },
    },
    trustHost: true,
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:45',message:'NextAuth config object created successfully',data:{hasSecret:!!nextAuthConfig.secret,hasProviders:!!nextAuthConfig.providers,providerCount:nextAuthConfig.providers?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
} catch (error: any) {
  // #region agent log
  console.error('[AUTH DEBUG] Error creating NextAuth config', {
    errorMessage: error?.message || 'unknown',
    errorStack: error?.stack?.substring(0, 200) || 'none',
    hypothesisId: 'E'
  });
  fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:50',message:'Error creating NextAuth config',data:{errorMessage:error?.message||'unknown',errorStack:error?.stack?.substring(0,200)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  throw error
}

let authExports: any
try {
  authExports = NextAuth(nextAuthConfig)
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:60',message:'NextAuth initialized successfully',data:{hasHandlers:!!authExports.handlers,hasAuth:!!authExports.auth,hasSignIn:!!authExports.signIn,hasSignOut:!!authExports.signOut},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
} catch (error: any) {
  // #region agent log
  console.error('[AUTH DEBUG] Error initializing NextAuth', {
    errorMessage: error?.message || 'unknown',
    errorStack: error?.stack?.substring(0, 200) || 'none',
    hypothesisId: 'E'
  });
  fetch('http://127.0.0.1:7245/ingest/1b0fe892-c4ac-43c7-8e8f-e035e4b05662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:66',message:'Error initializing NextAuth',data:{errorMessage:error?.message||'unknown',errorStack:error?.stack?.substring(0,200)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  throw error
}

export const { handlers, auth, signIn, signOut } = authExports
