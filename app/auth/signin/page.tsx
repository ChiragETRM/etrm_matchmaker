'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession, signOut } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

// Function to clear NextAuth cookies
function clearAuthCookies() {
  const cookiesToClear = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    'next-auth.pkce.code_verifier',
    '__Secure-next-auth.pkce.code_verifier',
    'next-auth.state',
    '__Secure-next-auth.state',
  ]

  cookiesToClear.forEach((cookieName) => {
    // Clear with different path variations
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth;`
    // Clear with domain variations (for production)
    if (window.location.hostname !== 'localhost') {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`
    }
  })
}

function SignInContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')
  const errorDetails = searchParams.get('details')
  const [isClearingCookies, setIsClearingCookies] = useState(false)
  const [jobAlertPolicyAgreed, setJobAlertPolicyAgreed] = useState(false)

  // Handle errors by clearing cookies and retrying
  useEffect(() => {
    if (error && !isClearingCookies) {
      console.error('Authentication error:', error, errorDetails)
      // Clear cookies on error to fix stale session issues
      // This is especially important for PKCE errors where cookies may be corrupted
      clearAuthCookies()
      setIsClearingCookies(true)
      
      // If it's a configuration error, PKCE error, state error, or other critical error, sign out first
      if (error === 'Configuration' || error === 'AccessDenied' || error === 'PKCEError' || error === 'StateError') {
        signOut({ redirect: false }).then(() => {
          // Clear cookies again after sign out
          setTimeout(() => {
            clearAuthCookies()
            // Reload page to start fresh
            window.location.href = '/auth/signin'
          }, 100)
        })
      }
    }
  }, [error, isClearingCookies])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Check if job alert policy agreement needs to be saved
      const savePolicyAgreement = async () => {
        const policyAgreed = searchParams.get('jobAlertPolicyAgreed') === 'true' || 
                            sessionStorage.getItem('jobAlertPolicyAgreed') === 'true'
        
        if (policyAgreed) {
          try {
            await fetch('/api/auth/job-alert-policy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            })
            sessionStorage.removeItem('jobAlertPolicyAgreed')
          } catch (error) {
            console.error('Error saving job alert policy agreement:', error)
          }
        }
      }

      // Decode the callbackUrl in case it's URL-encoded
      let decodedUrl = callbackUrl
      try {
        decodedUrl = decodeURIComponent(callbackUrl)
      } catch {
        decodedUrl = callbackUrl
      }

      // Extract pathname if it's an absolute URL
      try {
        const urlObj = new URL(decodedUrl, window.location.origin)
        // Only use the pathname if it's the same origin
        if (urlObj.origin === window.location.origin) {
          decodedUrl = urlObj.pathname + urlObj.search
          // Remove jobAlertPolicyAgreed from query params before redirecting
          const url = new URL(decodedUrl, window.location.origin)
          url.searchParams.delete('jobAlertPolicyAgreed')
          decodedUrl = url.pathname + url.search
        } else {
          // Different origin - default to dashboard for safety
          decodedUrl = '/dashboard'
        }
      } catch {
        // If URL parsing fails, ensure it starts with /
        if (!decodedUrl.startsWith('/')) {
          decodedUrl = '/' + decodedUrl
        }
      }

      // Save policy agreement and then redirect
      savePolicyAgreement().then(() => {
        // Use router.push for client-side navigation
        router.push(decodedUrl)
      })
    }
  }, [status, session, callbackUrl, router, searchParams])

  const handleSignIn = async () => {
    if (!jobAlertPolicyAgreed) {
      alert('Please agree to receive job alerts from our platform to continue.')
      return
    }

    // Clear any stale cookies before signing in
    clearAuthCookies()
    setIsClearingCookies(true)
    
    try {
      // Store the policy agreement in sessionStorage to pass to the callback
      sessionStorage.setItem('jobAlertPolicyAgreed', 'true')
      
      await signIn('google', { 
        callbackUrl: `${callbackUrl}?jobAlertPolicyAgreed=true`,
        redirect: true,
      })
    } catch (err) {
      console.error('Sign in error:', err)
      // Clear cookies on error
      clearAuthCookies()
      // Reload page
      window.location.href = '/auth/signin?error=SignInError'
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Redirecting...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900">
          Hand Picked ETRM/CTRM Jobs
        </h1>
        <h2 className="mt-6 text-center text-xl text-gray-600">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 mb-2 font-medium">
                {error === 'OAuthAccountNotLinked'
                  ? 'This email is already associated with another account.'
                  : error === 'Configuration'
                  ? 'Authentication configuration error. Please try again after clearing your browser cookies.'
                  : error === 'AccessDenied'
                  ? 'Access denied. Please try again.'
                  : error === 'Verification'
                  ? 'Verification error. Please try again.'
                  : error === 'PKCEError' || error === 'StateError'
                  ? 'Session error. Please clear your browser cookies and try again.'
                  : 'An error occurred during sign in. Please try again.'}
              </p>
              {errorDetails && (
                <p className="text-xs text-red-500 mb-2 mt-1 font-mono break-all">
                  {decodeURIComponent(errorDetails)}
                </p>
              )}
              {error === 'Configuration' && (
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => {
                      clearAuthCookies()
                      signOut({ redirect: false }).then(() => {
                        window.location.href = '/auth/signin'
                      })
                    }}
                    className="text-xs text-red-600 underline hover:text-red-800 mr-4"
                  >
                    Clear cookies and retry
                  </button>
                  <a
                    href="/api/auth/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-600 underline hover:text-red-800"
                  >
                    Check configuration
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jobAlertPolicyAgreed}
                  onChange={(e) => setJobAlertPolicyAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    I agree to receive job alerts from this platform
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    By signing in, you consent to receive email notifications about new job opportunities that match your profile and preferences.
                  </p>
                </div>
              </label>
            </div>
            
            <button
              onClick={handleSignIn}
              disabled={isClearingCookies || !jobAlertPolicyAgreed}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="mt-6">
            <p className="text-center text-sm text-gray-500">
              Sign in with your Google account to access the recruiter and
              candidate dashboards.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
