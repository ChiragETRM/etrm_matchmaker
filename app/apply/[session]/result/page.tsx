'use client'

import { useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function ApplyResultPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const passed = searchParams.get('passed') === 'true'
  const session = pathname?.split('/')[2] || ''

  if (passed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4 text-green-600">
              Congratulations!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              You meet the minimum requirements for this role.
            </p>
            <p className="text-gray-600 mb-8">
              Please continue to submit your CV and contact details.
            </p>
          </div>
          <Link
            href={`/apply/${session}/submit`}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
          >
            Continue to Submit CV
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4 text-red-600">
            Application Not Successful
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Unfortunately, we can't recommend applying for this role right now
            because you don't meet the minimum requirements.
          </p>
          <p className="text-gray-500 text-sm">
            Thank you for your interest. We encourage you to browse other
            opportunities.
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Browse Other Jobs
        </Link>
      </div>
    </div>
  )
}