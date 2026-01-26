'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'

function PostJobSuccessContent() {
  const searchParams = useSearchParams()
  const [jobUrl, setJobUrl] = useState('')
  const [expiryDate, setExpiryDate] = useState('N/A')

  useEffect(() => {
    const slug = searchParams.get('slug')
    const expiresAt = searchParams.get('expiresAt')
    
    if (slug) {
      setJobUrl(`${window.location.origin}/jobs/${slug}`)
    }
    
    if (expiresAt) {
      setExpiryDate(new Date(expiresAt).toLocaleDateString())
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-4">Job Created Successfully!</h1>
        <p className="text-gray-600 mb-6">
          Your job posting has been created and is now live.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={jobUrl}
                readOnly
                className="flex-1 border rounded px-3 py-2 bg-gray-50"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jobUrl)
                  alert('Copied to clipboard!')
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires On
            </label>
            <p className="text-lg font-semibold">{expiryDate}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href={jobUrl}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Job
          </Link>
          <Link
            href="/jobs"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            See it in job list
          </Link>
          <Link
            href="/post-job"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Post Another Job
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PostJobSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PostJobSuccessContent />
    </Suspense>
  )
}