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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/jobs" className="text-indigo-600 hover:underline mb-4 inline-block">
            ← Back to jobs
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Eligible Jobs</h1>
          <p className="text-gray-600 mt-2">
            Answer a few questions. We&apos;ll show only roles that match your profile.
            Answer all questions for the best results.
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
          <>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-white p-8 rounded-xl shadow space-y-6"
            >
              {questions.map((q) => (
                <div key={q.key}>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    {q.label}
                  </label>
                  {q.type === 'BOOLEAN' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" value="true" {...register(q.key)} />
                        Yes
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" value="false" {...register(q.key)} />
                        No
                      </label>
                    </div>
                  )}
                  {q.type === 'SINGLE_SELECT' && (
                    <select
                      {...register(q.key)}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 outline-none"
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
                    <div className="space-y-2">
                      {q.options?.map((o) => (
                        <label key={o} className="flex items-center gap-2">
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
                          />
                          {o}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === 'NUMBER' && (
                    <input
                      type="number"
                      {...register(q.key, { valueAsNumber: true })}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 outline-none"
                    />
                  )}
                  {q.type === 'COUNTRY' && (
                    <input
                      type="text"
                      {...register(q.key)}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 outline-none"
                      placeholder="Country"
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {submitting ? 'Finding jobs…' : 'Find my jobs'}
              </button>
            </form>

            {jobs !== null && (
              <div className="mt-8">
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
          </>
        )}
      </div>
    </div>
  )
}
