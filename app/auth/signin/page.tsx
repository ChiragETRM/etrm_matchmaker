'use client'

import { useEffect, useState, useRef } from 'react'
import { signIn, useSession, signOut } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

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
  cookiesToClear.forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth;`
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
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const termsScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error && !isClearingCookies) {
      clearAuthCookies()
      setIsClearingCookies(true)
      if (['Configuration', 'AccessDenied', 'PKCEError', 'StateError'].includes(error)) {
        signOut({ redirect: false }).then(() => {
          setTimeout(() => {
            clearAuthCookies()
            window.location.href = '/auth/signin'
          }, 100)
        })
      }
    }
  }, [error, isClearingCookies])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const savePolicyAgreement = async () => {
        const policyAgreed = searchParams.get('termsAgreed') === 'true' || sessionStorage.getItem('termsAgreed') === 'true'
        if (policyAgreed) {
          try {
            await fetch('/api/auth/job-alert-policy', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            sessionStorage.removeItem('termsAgreed')
          } catch {}
        }
      }
      let decodedUrl = callbackUrl
      try { decodedUrl = decodeURIComponent(callbackUrl) } catch {}
      try {
        const urlObj = new URL(decodedUrl, window.location.origin)
        if (urlObj.origin === window.location.origin) {
          const u = new URL(decodedUrl, window.location.origin)
          u.searchParams.delete('termsAgreed')
          decodedUrl = u.pathname + u.search
        } else decodedUrl = '/dashboard'
      } catch {
        if (!decodedUrl.startsWith('/')) decodedUrl = '/' + decodedUrl
      }
      savePolicyAgreement().then(() => router.push(decodedUrl))
    }
  }, [status, session, callbackUrl, router, searchParams])

  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termsAgreed) {
      alert('Please agree to the LearnETRM Terms & Conditions to continue.')
      return
    }
    const emailTrim = email.trim().toLowerCase()
    if (!emailTrim) {
      setOtpError('Please enter your email address.')
      return
    }
    setOtpError('')
    setOtpLoading(true)
    try {
      const res = await fetch('/api/auth/email/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim, name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOtpError(data.error || 'Failed to send code.')
        return
      }
      sessionStorage.setItem('otpEmail', emailTrim)
      sessionStorage.setItem('otpName', name.trim())
      const params = new URLSearchParams({ email: emailTrim })
      if (callbackUrl && callbackUrl !== '/dashboard') params.set('callbackUrl', callbackUrl)
      router.push(`/auth/verify?${params.toString()}`)
    } catch {
      setOtpError('Something went wrong. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!termsAgreed) {
      alert('Please agree to the LearnETRM Terms & Conditions to continue.')
      return
    }
    clearAuthCookies()
    setIsClearingCookies(true)
    try {
      sessionStorage.setItem('termsAgreed', 'true')
      await signIn('google', { callbackUrl: `${callbackUrl}?termsAgreed=true`, redirect: true })
    } catch {
      clearAuthCookies()
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
        <h1 className="text-center text-3xl font-bold text-gray-900">Hand Picked ETRM/CTRM Jobs</h1>
        <h2 className="mt-6 text-center text-xl text-gray-600">Sign in to your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">
                {error === 'OAuthAccountNotLinked' ? 'This email is already associated with another account.'
                  : error === 'Configuration' ? 'Authentication configuration error. Please try again after clearing cookies.'
                  : error === 'PKCEError' || error === 'StateError' ? 'Session error. Please clear cookies and try again.'
                  : 'An error occurred. Please try again.'}
              </p>
              {errorDetails && <p className="text-xs text-red-500 mt-1 break-all">{decodeURIComponent(errorDetails)}</p>}
            </div>
          )}

          <form onSubmit={handleOtpRequest} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name (required for first-time registration; optional for returning users)</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {otpError && <p className="text-sm text-red-600">{otpError}</p>}
            <button
              type="submit"
              disabled={otpLoading || !termsAgreed}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {otpLoading ? 'Sending...' : 'Send verification code'}
            </button>
          </form>

          <p className="mt-2 text-sm text-gray-500 text-center" role="status">
            If an account exists for this email, a code has been sent.
          </p>

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50">
            <div
              ref={termsScrollRef}
              className="max-h-48 overflow-y-auto p-4 text-sm text-gray-700"
              onScroll={() => {
                const el = termsScrollRef.current
                if (el) setHasScrolledToBottom(el.scrollHeight - el.scrollTop <= el.clientHeight + 20)
              }}
            >
              <p className="font-semibold mb-2">LearnETRM – Platform Terms</p>
              <p className="mb-3">By signing in or applying, you agree to our terms. LearnETRM is a curated job platform. By applying, you authorize us to represent you for that role and share your profile with the hiring company.</p>
              <p className="mb-3">You confirm your information is accurate and you have not applied to the same role through another channel.</p>
              <p className="text-gray-600">By signing in you consent to job-related emails from LearnETRM.</p>
            </div>
            <div className="p-4 border-t">
              <label className={`flex items-start gap-3 cursor-pointer ${!hasScrolledToBottom ? 'opacity-75' : ''}`}>
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  disabled={!hasScrolledToBottom}
                  className="mt-1 h-5 w-5 text-indigo-600 focus:ring-indigo-500 rounded"
                />
                <span className="text-sm font-medium">I agree to the LearnETRM Terms & Conditions</span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-gray-500">Or continue with</span></div>
            </div>
            <div className="mt-6 space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isClearingCookies || !termsAgreed}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>

              <p className="text-center">
                <Link href="/auth/login" className="text-sm text-indigo-600 hover:text-indigo-500">Sign in with email and password</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>}>
      <SignInContent />
    </Suspense>
  )
}
