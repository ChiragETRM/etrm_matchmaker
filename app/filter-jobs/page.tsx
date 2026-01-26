'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

interface Question {
  key: string
  label: string
  type: 'BOOLEAN' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'NUMBER' | 'COUNTRY'
  options: string[] | null
  orderIndex: number
}

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

export default function FilterJobsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>({})
  const { register, handleSubmit, watch, setValue } = useForm()

  useEffect(() => {
    fetch('/api/public/filter-questions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setQuestions(d.questions ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const onSubmit = async (data: Record<string, unknown>) => {
    const answers = { ...data, ...multiValues }
    setSubmitting(true)
    setJobs(null)
    try {
      const res = await fetch('/api/public/filter-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const json = await res.json()
      setJobs(json.jobs ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/jobs" className="text-indigo-600 hover:underline mb-4 inline-block">
            ← Back to jobs
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Eligible Jobs</h1>
          <p className="text-gray-600 mt-2">
            Answer a few questions. We&apos;ll show only roles that match your profile.
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow text-center">
            <p className="text-gray-600">
              No filter questions available yet. Try browsing all jobs.
            </p>
            <Link
              href="/jobs"
              className="inline-block mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Browse jobs
            </Link>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Left Sidebar - Filters */}
            <div className="w-80 flex-shrink-0">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white p-6 rounded-xl shadow sticky top-4"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Criteria</h2>
                <div className="space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {questions.map((q) => (
                    <div key={q.key} className="border-b border-gray-100 pb-4 last:border-0">
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        {q.label}
                      </label>
                      {q.type === 'BOOLEAN' && (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="radio" value="true" {...register(q.key)} className="w-4 h-4" />
                            Yes
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="radio" value="false" {...register(q.key)} className="w-4 h-4" />
                            No
                          </label>
                        </div>
                      )}
                      {q.type === 'SINGLE_SELECT' && (
                        <select
                          {...register(q.key)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">Select</option>
                          {q.options?.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      )}
                      {q.type === 'MULTI_SELECT' && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {q.options?.map((o) => (
                            <label key={o} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={(multiValues[q.key] ?? []).includes(o)}
                                onChange={(e) => {
                                  const prev = multiValues[q.key] ?? []
                                  const next = e.target.checked
                                    ? [...prev.filter((x) => x !== o), o]
                                    : prev.filter((x) => x !== o)
                                  setMultiValues((m) => ({ ...m, [q.key]: next }))
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">{o}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {q.type === 'NUMBER' && (
                        <input
                          type="number"
                          {...register(q.key, { valueAsNumber: true })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      )}
                      {q.type === 'COUNTRY' && (
                        <input
                          type="text"
                          {...register(q.key)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          placeholder="Country"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-6 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition"
                >
                  {submitting ? 'Finding jobs…' : 'Find my jobs'}
                </button>
              </form>
            </div>

            {/* Right Content - Results */}
            <div className="flex-1 min-w-0">
              {jobs !== null && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {jobs.length === 0
                      ? 'No matching jobs'
                      : `${jobs.length} job${jobs.length === 1 ? '' : 's'} match`}
                  </h2>
                  {jobs.length === 0 ? (
                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-gray-600">
                        No roles match your answers right now. Try browsing all jobs or
                        tweaking your answers.
                      </p>
                      <Link
                        href="/jobs"
                        className="inline-block mt-4 text-indigo-600 hover:underline"
                      >
                        Browse all jobs
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobs.map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.slug}`}
                          className="block bg-white p-6 rounded-xl shadow hover:shadow-lg transition"
                        >
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          {job.companyName && (
                            <p className="text-gray-600 mt-1">{job.companyName}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-sm text-gray-500 mt-2">
                            <span>{job.locationText}</span>
                            <span>•</span>
                            <span>{job.remotePolicy}</span>
                            <span>•</span>
                            <span>{job.contractType}</span>
                            <span>•</span>
                            <span>{job.roleCategory}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {jobs === null && (
                <div className="bg-white p-12 rounded-xl shadow text-center">
                  <p className="text-gray-500">
                    Fill out the filter criteria on the left and click &quot;Find my jobs&quot; to see matching roles.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
