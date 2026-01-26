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

const FILTER_OPTIONS = {
  remotePolicy: [
    { value: 'ONSITE', label: 'Onsite' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'REMOTE', label: 'Remote' },
  ],
  contractType: [
    { value: 'PERM', label: 'Permanent' },
    { value: 'CONTRACT', label: 'Contract' },
  ],
  seniority: [
    { value: 'JUNIOR', label: 'Junior' },
    { value: 'MID', label: 'Mid' },
    { value: 'SENIOR', label: 'Senior' },
  ],
  roleCategory: [
    { value: 'BA', label: 'Business Analyst' },
    { value: 'DEV', label: 'Developer' },
    { value: 'OPS', label: 'Operations' },
    { value: 'RISK', label: 'Risk' },
    { value: 'TRADING', label: 'Trading' },
    { value: 'COMPLIANCE', label: 'Compliance' },
  ],
  etrmPackage: [
    { value: 'Endur', label: 'Endur' },
    { value: 'Allegro', label: 'Allegro' },
    { value: 'RightAngle', label: 'RightAngle' },
    { value: 'Trayport', label: 'Trayport' },
  ],
  commodity: [
    { value: 'Power', label: 'Power' },
    { value: 'Gas', label: 'Gas' },
    { value: 'LNG', label: 'LNG' },
    { value: 'Oil', label: 'Oil' },
    { value: 'Emissions', label: 'Emissions' },
  ],
}

function JobsContent() {
  const searchParams = useSearchParams()
  const slugFromUrl = searchParams.get('slug')

  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
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

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => (key === 'nearMe' ? value : value !== '')
  ).length

  const clearFilters = () => {
    setFilters({
      remotePolicy: '',
      contractType: '',
      seniority: '',
      roleCategory: '',
      etrmPackage: '',
      commodity: '',
      nearMe: false,
    })
  }

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

  const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-b border-gray-100 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  )

  const FilterCheckbox = ({
    filterKey,
    options,
  }: {
    filterKey: keyof typeof filters
    options: { value: string; label: string }[]
  }) => (
    <div className="space-y-1">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-indigo-600 transition-colors"
        >
          <input
            type="radio"
            name={filterKey}
            checked={filters[filterKey] === option.value}
            onChange={() =>
              setFilters({
                ...filters,
                [filterKey]: filters[filterKey] === option.value ? '' : option.value,
              })
            }
            className="w-3.5 h-3.5 text-indigo-600 border-gray-300 focus:ring-indigo-500 focus:ring-1"
          />
          <span className="text-sm text-gray-700">{option.label}</span>
        </label>
      ))}
    </div>
  )

  const FiltersContent = () => (
    <>
      {/* Location filter */}
      <FilterSection title="Location">
        <label className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-indigo-600 transition-colors">
          <input
            type="checkbox"
            checked={filters.nearMe}
            onChange={(e) => setFilters({ ...filters, nearMe: e.target.checked })}
            className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 focus:ring-1"
          />
          <span className="text-sm text-gray-700">Near me</span>
        </label>
        {detectedCountry && filters.nearMe && (
          <p className="text-xs text-indigo-600 mt-1 ml-5">{detectedCountry}</p>
        )}
      </FilterSection>

      <FilterSection title="Work Mode">
        <FilterCheckbox filterKey="remotePolicy" options={FILTER_OPTIONS.remotePolicy} />
      </FilterSection>

      <FilterSection title="Contract">
        <FilterCheckbox filterKey="contractType" options={FILTER_OPTIONS.contractType} />
      </FilterSection>

      <FilterSection title="Level">
        <FilterCheckbox filterKey="seniority" options={FILTER_OPTIONS.seniority} />
      </FilterSection>

      <FilterSection title="Role">
        <FilterCheckbox filterKey="roleCategory" options={FILTER_OPTIONS.roleCategory} />
      </FilterSection>

      <FilterSection title="ETRM Package">
        <FilterCheckbox filterKey="etrmPackage" options={FILTER_OPTIONS.etrmPackage} />
      </FilterSection>

      <FilterSection title="Commodity">
        <FilterCheckbox filterKey="commodity" options={FILTER_OPTIONS.commodity} />
      </FilterSection>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile filter drawer overlay */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileFiltersOpen(false)}
        />
      )}

      {/* Mobile filter drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 lg:hidden ${
          mobileFiltersOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">Filters</h2>
          <button
            onClick={() => setMobileFiltersOpen(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
          <FiltersContent />
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 w-full text-sm text-indigo-600 hover:text-indigo-800 py-2"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      <div className="flex h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-60 border-r border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Filters</h2>
              {activeFilterCount > 0 && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FiltersContent />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-xs bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <h1 className="text-xl font-bold text-gray-900">Browse Jobs</h1>
              {!loading && (
                <span className="text-sm text-gray-500">
                  {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                </span>
              )}
            </div>
            <Link
              href="/filter-jobs"
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium whitespace-nowrap"
            >
              Eligible Jobs
            </Link>
          </header>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Jobs list */}
              <div className="lg:col-span-2 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Loading jobs...</div>
                ) : jobs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No jobs found.</p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="overflow-y-auto divide-y divide-gray-100 flex-1">
                    {jobs.map((job) => (
                      <li key={job.id}>
                        <button
                          type="button"
                          onClick={() => selectJob(job)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                            selectedJob?.slug === job.slug
                              ? 'bg-indigo-50 border-l-3 border-indigo-600'
                              : ''
                          }`}
                        >
                          <h2 className="font-medium text-gray-900 text-sm truncate">{job.title}</h2>
                          {job.companyName && (
                            <p className="text-xs text-gray-600 truncate mt-0.5">{job.companyName}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-xs text-gray-500">{job.locationText}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-500">{job.remotePolicy}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-500">{job.contractType}</span>
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

              {/* Job detail */}
              <div className="lg:col-span-3 bg-white overflow-hidden flex flex-col">
                {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    Loading...
                  </div>
                ) : selectedJob ? (
                  <div className="overflow-y-auto flex-1 p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{selectedJob.title}</h1>
                    {selectedJob.companyName && (
                      <p className="text-lg text-gray-600 mb-3">{selectedJob.companyName}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">{selectedJob.locationText}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">{selectedJob.remotePolicy}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">{selectedJob.contractType}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">{selectedJob.seniority}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">{selectedJob.roleCategory}</span>
                    </div>
                    <p className="text-sm text-indigo-600 mb-4">
                      {daysLeftToApply(selectedJob.expiresAt)}
                    </p>

                    {selectedJob.etrmPackages?.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">ETRM Packages: </span>
                        <span className="text-sm text-gray-600">{selectedJob.etrmPackages.join(', ')}</span>
                      </div>
                    )}
                    {selectedJob.commodityTags?.length > 0 && (
                      <div className="mb-4">
                        <span className="text-sm font-medium text-gray-700">Commodities: </span>
                        <span className="text-sm text-gray-600">{selectedJob.commodityTags.join(', ')}</span>
                      </div>
                    )}

                    <div className="border-t pt-4 mb-6">
                      <h2 className="text-lg font-semibold mb-3">Job Description</h2>
                      <div
                        className="prose prose-sm max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{
                          __html: renderSimpleMarkdown(selectedJob.jdText),
                        }}
                      />
                    </div>

                    <Link
                      href={`/apply/start/${selectedJob.id}`}
                      className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                    >
                      Apply Now
                    </Link>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-12 text-gray-400">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p>Select a job to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
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
