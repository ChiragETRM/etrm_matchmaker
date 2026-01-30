'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const RESEND_COOLDOWN_SEC = 60

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const emailFromUrl = searchParams.get('email') || ''
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const [email, setEmail] = useState(emailFromUrl)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)

  // Sync email from URL or sessionStorage; only redirect to signin when there is
  // no email from any source (avoids redirecting after OTP success when we've
  // cleared storage but form POST / redirect hasn't happened yet)
  useEffect(() => {
    const stored = sessionStorage.getItem('otpEmail')
    if (stored) {
      setEmail(stored)
      return
    }
    if (emailFromUrl) {
      setEmail(emailFromUrl)
      return
    }
    if (!email) router.push('/auth/signin')
  }, [emailFromUrl, email, router])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const eTrim = email.trim().toLowerCase()
    const otpTrim = otp.trim()
    if (!eTrim || !otpTrim) {
      setError('Please enter your email and the 6-digit code.')
      return
    }
    if (!/^\d{6}$/.test(otpTrim)) {
      setError('Please enter a valid 6-digit code.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const nameFromStorage = sessionStorage.getItem('otpName')
      const res = await fetch('/api/auth/email/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eTrim, otp: otpTrim, name: nameFromStorage || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid or expired code.')
        setLoading(false)
        return
      }
      sessionStorage.removeItem('otpEmail')
      sessionStorage.removeItem('otpName')
      if (data.needsPasswordSetup) {
        sessionStorage.setItem('onboardingToken', data.signInToken)
        const params = new URLSearchParams()
        params.set('callbackUrl', callbackUrl)
        params.set('email', eTrim)
        window.location.href = `/auth/onboarding?${params.toString()}`
        return
      }
      await completeSignInWithFormPost(data.signInToken, callbackUrl)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  /**
   * Submit credentials via form POST so the browser does a full navigation.
   * This guarantees the session cookie is set and the redirect lands with auth.
   * (signIn(..., { redirect: false }) + router.push was unreliable.)
   */
  const completeSignInWithFormPost = async (token: string, callbackUrl: string) => {
    const { getCsrfToken } = await import('next-auth/react')
    const csrfToken = await getCsrfToken()
    if (!csrfToken) {
      setError('Session error. Please try again.')
      setLoading(false)
      return
    }
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/callback/credentials'
    form.style.display = 'none'
    const fields: [string, string][] = [
      ['csrfToken', csrfToken],
      ['token', token],
      ['callbackUrl', callbackUrl],
    ]
    fields.forEach(([name, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    })
    document.body.appendChild(form)
    form.submit()
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return
    const eTrim = email.trim().toLowerCase()
    if (!eTrim) return
    setResendLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/email/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eTrim }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to resend.')
        return
      }
      setResendCooldown(RESEND_COOLDOWN_SEC)
    } catch {
      setError('Failed to resend.')
    } finally {
      setResendLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const signInUrl = `/auth/signin${callbackUrl && callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center gap-2 mb-4" aria-label="Progress">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">1</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-medium">2</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">3</span>
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-900">Enter verification code</h1>
        <p className="mt-2 text-center text-sm text-gray-600">Step 2: Enter the 6-digit code sent to your email.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
                <Link
                  href={signInUrl}
                  className="shrink-0 text-sm text-indigo-600 hover:text-indigo-500 whitespace-nowrap"
                >
                  Change email
                </Link>
              </div>
            </div>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Verification code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-widest"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="text-sm text-indigo-600 hover:text-indigo-500 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : resendLoading ? 'Sending...' : 'Resend code'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href={signInUrl} className="text-indigo-600 hover:text-indigo-500">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>}>
      <VerifyContent />
    </Suspense>
  )
}
