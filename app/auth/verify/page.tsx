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

  useEffect(() => {
    const stored = sessionStorage.getItem('otpEmail')
    if (stored) setEmail(stored)
    else if (emailFromUrl) setEmail(emailFromUrl)
    else router.push('/auth/signin')
  }, [emailFromUrl, router])

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
        return
      }
      sessionStorage.removeItem('otpEmail')
      sessionStorage.removeItem('otpName')
      const signInOk = await completeSignIn(data.signInToken)
      if (!signInOk) return
      if (data.needsPasswordSetup) {
        router.push(`/auth/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      } else {
        router.push(callbackUrl)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const completeSignIn = async (token: string): Promise<boolean> => {
    const { signIn } = await import('next-auth/react')
    const result = await signIn('credentials', {
      token,
      redirect: false,
    })
    if (result?.error) {
      setError('Session error. Please try again.')
      return false
    }
    return true
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Enter verification code</h1>
        <p className="mt-2 text-center text-sm text-gray-600">We sent a 6-digit code to {email}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
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
            <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-500">Back to sign in</Link>
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
