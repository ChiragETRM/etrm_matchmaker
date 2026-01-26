'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { renderSimpleMarkdown } from '@/lib/markdown'
import { daysLeftToApply } from '@/lib/utils'

interface JobListItem {
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
  createdAt: string
  expiresAt: string
}

interface JobDetail extends JobListItem {
  jdText: string
}

function JobsContent() {
  const searchParams = useSearchParams()
  const slugFromUrl = searchParams.get('slug')

  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filters, setFilters] = useState({
    remotePolicy: '',
    contractType: '',
    seniority: '',
    roleCategory: '',
    etrmPackage: '',
    commodity: '',
    nearMe: false,
  })
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setDetectedCountry(null)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'nearMe') {
          if (value) params.append('nearMe', '1')
        } else if (value && typeof value === 'string') {
          params.append(key, value)
        }
      })

      const response = await fetch(`/api/public/jobs?${params.toString()}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      })
      const data = await response.json()
      setJobs(data.jobs || [])
      if (data.detectedCountry) setDetectedCountry(data.detectedCountry)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const fetchJobDetail = useCallback(async (slug: string) => {
    setDetailLoading(true)
    setSelectedJob(null)
    try {
      const response = await fetch(`/api/public/jobs/${slug}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedJob(data.job)
      }
    } catch (error) {
      console.error('Error fetching job:', error)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Sync selection from URL
  useEffect(() => {
    if (slugFromUrl && (!selectedJob || selectedJob.slug !== slugFromUrl)) {
      fetchJobDetail(slugFromUrl)
    }
  }, [slugFromUrl, selectedJob, fetchJobDetail])

  const selectJob = (job: JobListItem) => {
    setSelectedJob(null)
    fetchJobDetail(job.slug)
    const url = new URL(window.location.href)
    url.searchParams.set('slug', job.slug)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header + Eligible Jobs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Browse Jobs</h1>
          <Link
            href="/filter-jobs"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Eligible Jobs
          </Link>
        </div>

        {detectedCountry && (
          <p className="text-sm text-indigo-600 mb-4">
            Showing jobs near you ({detectedCountry})
          </p>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.nearMe}
                  onChange={(e) =>
                    setFilters({ ...filters, nearMe: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="font-medium">Filter by my location</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Uses your IP to show jobs in your country
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Remote Policy</label>
              <select
                value={filters.remotePolicy}
                onChange={(e) =>
                  setFilters({ ...filters, remotePolicy: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All</option>
                <option value="ONSITE">Onsite</option>
                <option value="HYBRID">Hybrid</option>
                <option value="REMOTE">Remote</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract Type</label>
              <select
                value={filters.contractType}
                onChange={(e) =>
                  setFilters({ ...filters, contractType: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All</option>
                <option value="PERM">Permanent</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Seniority</label>
              <select
                value={filters.seniority}
                onChange={(e) =>
                  setFilters({ ...filters, seniority: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All</option>
                <option value="JUNIOR">Junior</option>
                <option value="MID">Mid</option>
                <option value="SENIOR">Senior</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role Category</label>
              <select
                value={filters.roleCategory}
                onChange={(e) =>
                  setFilters({ ...filters, roleCategory: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All</option>
                <option value="BA">Business Analyst</option>
                <option value="DEV">Developer</option>
                <option value="OPS">Operations</option>
                <option value="RISK">Risk</option>
                <option value="TRADING">Trading</option>
                <option value="COMPLIANCE">Compliance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ETRM Package</label>
              <select
                value={filters.etrmPackage}
                onChange={(e) =>
                  setFilters({ ...filters, etrmPackage: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All</option>
                <option value="Endur">Endur</option>
                <option value="Allegro">Allegro</option>
                <option value="RightAngle">RightAngle</option>
                <option value="Trayport">Trayport</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Commodity</label>
              <select
                value={filters.commodity}
                onChange={(e) =>
                  setFilters({ ...filters, commodity: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All</option>
                <option value="Power">Power</option>
                <option value="Gas">Gas</option>
                <option value="LNG">LNG</option>
                <option value="Oil">Oil</option>
                <option value="Emissions">Emissions</option>
              </select>
            </div>
          </div>
        </div>

        {/* List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Jobs list */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden flex flex-col max-h-[calc(100vh-20rem)]">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active jobs found.</div>
            ) : (
              <ul className="overflow-y-auto divide-y divide-gray-100">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => selectJob(job)}
                      className={`w-full text-left p-4 hover:bg-indigo-50 transition block ${
                        selectedJob?.slug === job.slug ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                      }`}
                    >
                      <h2 className="font-semibold text-gray-900 truncate">{job.title}</h2>
                      {job.companyName && (
                        <p className="text-sm text-gray-600 truncate">{job.companyName}</p>
                      )}
                      <div className="flex flex-wrap gap-1 text-xs text-gray-500 mt-1">
                        <span>{job.locationText}</span>
                        <span>{job.remotePolicy}</span>
                        <span>{job.contractType}</span>
                      </div>
                      <p className="text-xs text-indigo-600 mt-1">
                        {daysLeftToApply(job.expiresAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: Job detail */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col max-h-[calc(100vh-20rem)]">
            {detailLoading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : selectedJob ? (
              <div className="overflow-y-auto p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedJob.title}</h1>
                {selectedJob.companyName && (
                  <p className="text-lg text-gray-600 mb-4">{selectedJob.companyName}</p>
                )}
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-4">
                  <span>{selectedJob.locationText}</span>
                  <span>·</span>
                  <span>{selectedJob.remotePolicy}</span>
                  <span>·</span>
                  <span>{selectedJob.contractType}</span>
                  <span>·</span>
                  <span>{selectedJob.seniority}</span>
                  <span>·</span>
                  <span>{selectedJob.roleCategory}</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  {daysLeftToApply(selectedJob.expiresAt)}
                </p>

                {selectedJob.etrmPackages?.length > 0 && (
                  <div className="mb-4">
                    <strong className="text-gray-800">ETRM Packages:</strong>{' '}
                    {selectedJob.etrmPackages.join(', ')}
                  </div>
                )}
                {selectedJob.commodityTags?.length > 0 && (
                  <div className="mb-4">
                    <strong className="text-gray-800">Commodity Focus:</strong>{' '}
                    {selectedJob.commodityTags.join(', ')}
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Job Description</h2>
                  <div
                    className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: renderSimpleMarkdown(selectedJob.jdText),
                    }}
                  />
                </div>

                <Link
                  href={`/apply/start/${selectedJob.id}`}
                  className="inline-block w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-center font-semibold"
                >
                  Apply Now
                </Link>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-gray-500">
                Select a job to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <JobsContent />
    </Suspense>
  )
}
