import { handlers } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// Validate environment variables at runtime
function validateAuthConfig(req: NextRequest): { valid: boolean; error?: string } {
  const missing: string[] = []
  
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    missing.push('AUTH_SECRET or NEXTAUTH_SECRET')
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    missing.push('GOOGLE_CLIENT_ID')
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    missing.push('GOOGLE_CLIENT_SECRET')
  }
  
  if (missing.length > 0) {
    console.error('[NextAuth] Missing environment variables:', missing.join(', '))
    return {
      valid: false,
      error: `Missing required environment variables: ${missing.join(', ')}`,
    }
  }
  
  // Check AUTH_URL
  const authUrl = process.env.AUTH_URL || 
                  process.env.NEXTAUTH_URL || 
                  process.env.NEXT_PUBLIC_APP_URL ||
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  
  if (!authUrl) {
    console.warn('[NextAuth] AUTH_URL not set, using request origin')
  }
  
  return { valid: true }
}

// Wrap handlers with error handling to catch configuration and other errors
async function handleRequest(
  handler: (req: NextRequest) => Promise<Response>,
  req: NextRequest
) {
  // Validate configuration first
  const validation = validateAuthConfig(req)
  if (!validation.valid) {
    console.error('[NextAuth] Configuration validation failed:', validation.error)
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('error', 'Configuration')
    signInUrl.searchParams.set('details', encodeURIComponent(validation.error || 'Configuration error'))
    return NextResponse.redirect(signInUrl)
  }
  
  try {
    const response = await handler(req)
    
    // Check if the response indicates an error
    if (response.status >= 400) {
      const responseUrl = response.headers.get('location') || response.url || req.url
      const url = new URL(responseUrl, req.url)
      
      // If it's an error endpoint, redirect to sign-in with the error
      if (url.pathname.includes('/api/auth/error') || url.pathname.includes('/auth/error')) {
        const errorParam = url.searchParams.get('error') || 'SignInError'
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('error', errorParam)
        
        // Log the error for debugging
        console.error('[NextAuth] Error response:', {
          status: response.status,
          error: errorParam,
          url: url.toString(),
        })
        
        return NextResponse.redirect(signInUrl)
      }
      
      // For other error statuses, check the response body if possible
      if (response.status === 500) {
        try {
          const clonedResponse = response.clone()
          const text = await clonedResponse.text()
          if (text.includes('Configuration') || text.includes('AUTH_SECRET') || text.includes('GOOGLE_CLIENT')) {
            const signInUrl = new URL('/auth/signin', req.url)
            signInUrl.searchParams.set('error', 'Configuration')
            return NextResponse.redirect(signInUrl)
          }
        } catch {
          // Ignore errors reading response body
        }
      }
    }
    
    return response
  } catch (error) {
    console.error('[NextAuth] Handler error:', error)
    
    // If it's a configuration error, redirect to sign-in with error
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      if (
        errorMessage.includes('configuration') ||
        errorMessage.includes('auth_secret') ||
        errorMessage.includes('google_client') ||
        errorMessage.includes('missing') ||
        errorMessage.includes('required')
      ) {
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('error', 'Configuration')
        url.searchParams.set('details', encodeURIComponent(error.message))
        return NextResponse.redirect(url)
      }
      
      // Handle PKCE code verifier errors
      // This often happens when cookies are corrupted, expired, or not properly set
      if (
        errorMessage.includes('pkcecodeverifier') ||
        errorMessage.includes('pkce') ||
        errorMessage.includes('invalidcheck') ||
        errorMessage.includes('invalid_grant') ||
        errorMessage.includes('code verifier') ||
        errorMessage.includes('code_verifier')
      ) {
        console.error('[NextAuth] PKCE error detected:', {
          error: error.message,
          url: req.url,
          // Log cookie headers for debugging (in production, check logs)
          hasCookies: req.headers.get('cookie') ? 'yes' : 'no',
        })
        
        // Redirect to sign-in with error message
        // The user should clear cookies and try again
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('error', 'PKCEError')
        url.searchParams.set('details', encodeURIComponent('Authentication error. Please clear your browser cookies and try again.'))
        return NextResponse.redirect(url)
      }
      
      // Handle state cookie parsing errors
      // This happens when the state cookie is corrupted, expired, or can't be decrypted
      if (
        errorMessage.includes('state') && 
        (errorMessage.includes('could not be parsed') ||
         errorMessage.includes('invalidcheck') ||
         errorMessage.includes('parsing'))
      ) {
        console.error('[NextAuth] State cookie parsing error detected:', {
          error: error.message,
          url: req.url,
          hasCookies: req.headers.get('cookie') ? 'yes' : 'no',
          // Check if AUTH_SECRET is set (without logging the value)
          hasAuthSecret: !!process.env.AUTH_SECRET,
        })
        
        // Redirect to sign-in with error message
        // The user should clear cookies and try again
        const url = new URL('/auth/signin', req.url)
        url.searchParams.set('error', 'StateError')
        url.searchParams.set('details', encodeURIComponent('Session state error. Please clear your browser cookies and try again.'))
        return NextResponse.redirect(url)
      }
    }
    
    // For other errors, redirect to sign-in with generic error
    const url = new URL('/auth/signin', req.url)
    url.searchParams.set('error', 'SignInError')
    return NextResponse.redirect(url)
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(handlers.GET, req)
}

export async function POST(req: NextRequest) {
  return handleRequest(handlers.POST, req)
}
