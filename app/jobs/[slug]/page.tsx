'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { renderSimpleMarkdown } from '@/lib/markdown'
import { daysLeftToApply } from '@/lib/utils'

interface Job {
  id: string
  slug: string
  title: string
  companyName: string | null
  locationText: string
  remotePolicy: string
  contractType: string
  seniority: string
  roleCategory: string
  etrmPackages: string[]
  commodityTags: string[]
  experienceYearsMin: number | null
  budgetMin: number | null
  budgetMax: number | null
  budgetCurrency: string | null
  budgetPeriod: string | null
  budgetIsEstimate: boolean
  jdText: string
  createdAt: string
  expiresAt: string
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.slug) {
      fetchJob(params.slug as string)
    }
  }, [params.slug])

  const fetchJob = async (slug: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/public/jobs/${slug}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      })
      if (response.ok) {
        const data = await response.json()
        setJob(data.job)
      } else {
        console.error('Failed to fetch job')
      }
    } catch (error) {
      console.error('Error fetching job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (job) {
      router.push(`/apply/start/${job.id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <Link href="/jobs" className="text-blue-600 hover:underline">
            Browse Jobs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="mb-6">
            <Link
              href="/jobs"
              className="text-blue-600 hover:underline mb-4 inline-block"
            >
              ← Back to Jobs
            </Link>
            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
            {job.companyName && (
              <p className="text-xl text-gray-600 mb-4">{job.companyName}</p>
            )}
            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
              <span>{job.locationText}</span>
              <span>•</span>
              <span>{job.remotePolicy}</span>
              <span>•</span>
              <span>{job.contractType}</span>
              <span>•</span>
              <span>{job.seniority}</span>
              <span>•</span>
              <span>{job.roleCategory}</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">ETRM Details</h2>
            <div className="space-y-2 text-sm">
              {job.etrmPackages.length > 0 && (
                <div>
                  <strong>ETRM Packages:</strong> {job.etrmPackages.join(', ')}
                </div>
              )}
              {job.commodityTags.length > 0 && (
                <div>
                  <strong>Commodity Focus:</strong> {job.commodityTags.join(', ')}
                </div>
              )}
              {job.experienceYearsMin && (
                <div>
                  <strong>Minimum Experience:</strong> {job.experienceYearsMin} years
                </div>
              )}
            </div>
          </div>

          {job.budgetMin || job.budgetMax ? (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Budget</h2>
              <p className="text-sm">
                {job.budgetMin && job.budgetMax
                  ? `${job.budgetCurrency} ${job.budgetMin.toLocaleString()} - ${job.budgetMax.toLocaleString()}`
                  : job.budgetMin
                  ? `${job.budgetCurrency} ${job.budgetMin.toLocaleString()}+`
                  : `${job.budgetCurrency} Up to ${job.budgetMax?.toLocaleString()}`}
                {' '}
                {job.budgetPeriod === 'ANNUAL' ? 'per year' : 'per day'}
                {job.budgetIsEstimate && ' (estimated)'}
              </p>
            </div>
          ) : null}

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Job Description</h2>
            <div
              className="prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{
                __html: renderSimpleMarkdown(job.jdText),
              }}
            />
          </div>

          <div className="border-t pt-6">
            <button
              onClick={handleApply}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
            >
              Apply Now
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-500 text-center">
            {daysLeftToApply(job.expiresAt)}
          </div>
        </div>
      </div>
    </div>
  )
}