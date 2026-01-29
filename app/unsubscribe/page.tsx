'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const errorParam = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    success ? 'done' : 'idle'
  )

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/public/job-alerts/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow text-center">
        {status === 'done' ? (
          <>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Unsubscribed</h1>
            <p className="text-gray-600 mb-6">
              You have been successfully unsubscribed from LearnETRM job alerts.
              You will no longer receive email notifications about new roles.
            </p>
            <a
              href="/jobs"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse Jobs
            </a>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Unsubscribe from Job Alerts</h1>
            {errorParam === 'missing-email' && (
              <p className="text-red-600 text-sm mb-4">
                No email address was provided. Please enter your email below.
              </p>
            )}
            {status === 'error' && (
              <p className="text-red-600 text-sm mb-4">
                Something went wrong. Please try again.
              </p>
            )}
            <p className="text-gray-600 mb-6">
              Enter your email address to unsubscribe from all job alert notifications.
            </p>
            <form onSubmit={handleUnsubscribe} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full border rounded-lg px-3 py-2"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {status === 'loading' ? 'Processing...' : 'Unsubscribe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
