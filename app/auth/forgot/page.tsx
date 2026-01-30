'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Step = 'email' | 'verify' | 'done'

export default function ForgotPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const eTrim = email.trim().toLowerCase()
    if (!eTrim) {
      setError('Please enter your email.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/email/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eTrim }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send code.')
        return
      }
      setStep('verify')
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const eTrim = email.trim().toLowerCase()
    const otpTrim = otp.trim()
    if (!eTrim || !/^\d{6}$/.test(otpTrim)) {
      setError('Please enter the 6-digit code.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/password/forgot-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eTrim, otp: otpTrim }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid code.')
        return
      }
      router.push(`/auth/set-password?token=${encodeURIComponent(data.resetToken)}`)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    const eTrim = email.trim().toLowerCase()
    if (!eTrim) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/email/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eTrim }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Failed to resend.')
      else setResendCooldown(60)
    } catch {
      setError('Failed to resend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Reset password</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'email' ? 'Enter your email to receive a verification code' : 'Enter the 6-digit code we sent to your email'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          {step === 'email' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
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
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send code'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-500 text-center">If an account exists for this email, a code has been sent.</p>
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
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-widest"
                />
              </div>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="text-sm text-indigo-600 hover:text-indigo-500 disabled:text-gray-400"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-500">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
