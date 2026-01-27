import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const checks: Record<string, boolean | string> = {}
  const errors: string[] = []
  
  // Check AUTH_SECRET
  checks.AUTH_SECRET = !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)
  if (!checks.AUTH_SECRET) {
    errors.push('AUTH_SECRET or NEXTAUTH_SECRET is missing')
  }
  
  // Check Google OAuth credentials
  checks.GOOGLE_CLIENT_ID = !!process.env.GOOGLE_CLIENT_ID
  if (!checks.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID is missing')
  }
  
  checks.GOOGLE_CLIENT_SECRET = !!process.env.GOOGLE_CLIENT_SECRET
  if (!checks.GOOGLE_CLIENT_SECRET) {
    errors.push('GOOGLE_CLIENT_SECRET is missing')
  }
  
  // Check AUTH_URL
  const authUrl = process.env.AUTH_URL || 
                  process.env.NEXTAUTH_URL || 
                  process.env.NEXT_PUBLIC_APP_URL ||
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  checks.AUTH_URL = authUrl || 'Not set (will use auto-detection)'
  
  // Get request origin for reference
  const origin = req.headers.get('host')
  checks.requestOrigin = origin ? `https://${origin}` : 'Unknown'
  
  const allValid = errors.length === 0
  
  return NextResponse.json({
    status: allValid ? 'healthy' : 'unhealthy',
    checks,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  }, {
    status: allValid ? 200 : 500,
  })
}
