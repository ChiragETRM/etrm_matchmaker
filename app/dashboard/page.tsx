'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLandingPage() {
  const router = useRouter()
  const { status } = useSession()

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard')
    }
  }, [status, router])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center text-gray-500">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Dashboards</h1>
        <p className="text-gray-600 mb-8">
          View your applications or manage your job postings.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          <Link
            href="/dashboard/candidate"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-lg transition text-left"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Candidate dashboard
            </h2>
            <p className="text-gray-600 text-sm">
              See your CV, gate answers, and jobs you&apos;ve applied for.
            </p>
          </Link>
          <Link
            href="/dashboard/recruiter"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-lg transition text-left"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Recruiter dashboard
            </h2>
            <p className="text-gray-600 text-sm">
              Your posted jobs, candidates, shortlist or discard.
            </p>
          </Link>
        </div>
        <Link
          href="/"
          className="inline-block mt-8 text-gray-500 hover:text-gray-700"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
