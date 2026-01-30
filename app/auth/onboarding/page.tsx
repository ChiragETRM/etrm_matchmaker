'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const ONBOARDING_TOKEN_KEY = 'onboardingToken'

function OnboardingContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const emailFromUrl = searchParams.get('email') || ''
  const [onboardingToken, setOnboardingToken] = useState<string | null>(null)
  const [storageChecked, setStorageChecked] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setOnboardingToken(sessionStorage.getItem(ONBOARDING_TOKEN_KEY))
    setStorageChecked(true)
  }, [])

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name)
  }, [session?.user?.name])

  const canShowForm =
    storageChecked &&
    (onboardingToken !== null || status === 'authenticated')

  useEffect(() => {
    if (!storageChecked) return
    if (canShowForm) return
    if (onboardingToken !== null) return
    if (status === 'loading') return
    if (status === 'authenticated') return
    if (hasRedirected.current) return
    hasRedirected.current = true
    router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }, [storageChecked, canShowForm, onboardingToken, status, callbackUrl, router])

  const validate = () => {
    if (!name.trim()) return 'Please enter your name'
    if (password.length < 10) return 'Password must be at least 10 characters'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    if (password !== confirm) return 'Passwords do not match'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setLoading(true)
    try {
      if (onboardingToken) {
        const res = await fetch('/api/auth/onboarding-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: onboardingToken,
            name: name.trim(),
            password,
            callbackUrl,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to set up account.')
          setLoading(false)
          return
        }
        // Session created and cookie set by onboarding-complete API. Just redirect.
        sessionStorage.removeItem(ONBOARDING_TOKEN_KEY)
        window.location.href = data.redirectUrl || callbackUrl
        return
      }
      const res = await fetch('/api/auth/password/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to set password.')
        setLoading(false)
        return
      }
      router.push(callbackUrl)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!storageChecked || (!onboardingToken && status === 'loading')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!canShowForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Redirecting to sign in...</div>
      </div>
    )
  }

  const signInUrl = `/auth/signin${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center gap-2 mb-4" aria-label="Progress">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">1</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">2</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-medium">3</span>
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-900">Complete your profile</h1>
        <p className="mt-2 text-center text-sm text-gray-600">Step 3: Set your name and password</p>
        {emailFromUrl && (
          <p className="mt-1 text-center text-sm text-gray-500">Account: {emailFromUrl}</p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">Required for your account</p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                minLength={10}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">At least 10 characters, one uppercase, one lowercase, one number</p>
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••"
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Continue'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href={signInUrl} className="text-indigo-600 hover:text-indigo-500">Use a different email</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>}>
      <OnboardingContent />
    </Suspense>
  )
}
