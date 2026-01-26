'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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
  createdAt: string
  expiresAt: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Browse Jobs</h1>
          <Link
            href="/filter-jobs"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Filter jobs for me
          </Link>
        </div>

        {detectedCountry && (
          <p className="text-sm text-indigo-600 mb-4">
            Showing jobs near you ({detectedCountry})
          </p>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
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
              <label className="block text-sm font-medium mb-1">
                Remote Policy
              </label>
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
              <label className="block text-sm font-medium mb-1">
                Contract Type
              </label>
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
              <label className="block text-sm font-medium mb-1">
                Seniority
              </label>
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
              <label className="block text-sm font-medium mb-1">
                Role Category
              </label>
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
              <label className="block text-sm font-medium mb-1">
                ETRM Package
              </label>
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
              <label className="block text-sm font-medium mb-1">
                Commodity
              </label>
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

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No active jobs found.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.slug}`}
                className="block bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">
                      {job.title}
                    </h2>
                    {job.companyName && (
                      <p className="text-gray-600 mb-2">{job.companyName}</p>
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
                    {job.etrmPackages.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">ETRM: </span>
                        <span className="text-sm text-gray-600">
                          {job.etrmPackages.join(', ')}
                        </span>
                      </div>
                    )}
                    {job.commodityTags.length > 0 && (
                      <div className="mt-1">
                        <span className="text-sm font-medium">Commodities: </span>
                        <span className="text-sm text-gray-600">
                          {job.commodityTags.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Expires: {new Date(job.expiresAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}