'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface SimilarJob {
  id: string
  slug: string
  title: string
  companyName: string | null
  locationText: string
  remotePolicy: string
  contractType: string
  seniority: string
  roleCategory: string
}

export default function OneClickSuccessPage() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([])
  const [similarLoading, setSimilarLoading] = useState(true)

  useEffect(() => {
    if (!jobId) return
    fetch(`/api/apply/similar-jobs?jobId=${encodeURIComponent(jobId)}&limit=3`)
      .then((r) => r.json())
      .then((data) => setSimilarJobs(data.jobs ?? []))
      .catch(() => setSimilarJobs([]))
      .finally(() => setSimilarLoading(false))
  }, [jobId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4 text-green-600">
            Congratulations! You have applied for the role!
          </h1>
          <p className="text-gray-500 text-sm">
            The recruiter will review your application and contact you directly
            if you&apos;re a good fit for the role.
          </p>
        </div>

        {similarJobs.length > 0 && (
          <div className="mt-8 text-left border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Similar roles you might like
            </h2>
            <ul className="space-y-2">
              {similarJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.slug}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {job.title}
                  </Link>
                  {job.companyName && (
                    <span className="text-gray-500 text-sm"> · {job.companyName}</span>
                  )}
                  <span className="text-gray-400 text-sm block">
                    {job.locationText}
                    {job.contractType && ` · ${job.contractType}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {similarLoading && jobId && (
          <p className="text-gray-400 text-sm mt-4">Loading similar roles…</p>
        )}

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <a
            href="/jobs"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Browse Other Jobs
          </a>
          <Link
            href="/filter-jobs"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Eligible Jobs
          </Link>
        </div>
      </div>
    </div>
  )
}
