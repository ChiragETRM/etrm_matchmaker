import { NextResponse } from 'next/server'

// Diagnostic endpoint to check auth configuration
// This helps debug configuration issues without exposing secrets
export async function GET() {
  const envCheck = {
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasAuthUrl: !!process.env.AUTH_URL,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    authUrl: process.env.AUTH_URL || 'NOT_SET',
    // Show lengths instead of values for security
    authSecretLength: (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '').length,
    googleClientIdLength: (process.env.GOOGLE_CLIENT_ID || '').length,
    googleClientSecretLength: (process.env.GOOGLE_CLIENT_SECRET || '').length,
  }

  return NextResponse.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    config: envCheck,
    message: envCheck.hasAuthUrl 
      ? 'AUTH_URL is set' 
      : 'WARNING: AUTH_URL is missing (required for NextAuth v5 in production)',
    missing: [
      !envCheck.hasAuthSecret && !envCheck.hasNextAuthSecret && 'AUTH_SECRET or NEXTAUTH_SECRET',
      !envCheck.hasAuthUrl && 'AUTH_URL',
      !envCheck.hasGoogleClientId && 'GOOGLE_CLIENT_ID',
      !envCheck.hasGoogleClientSecret && 'GOOGLE_CLIENT_SECRET',
    ].filter(Boolean),
  })
}
