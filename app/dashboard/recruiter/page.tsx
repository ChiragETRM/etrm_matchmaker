'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AppItem {
  id: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string | null
  answersJson: string
  recruiterStatus: string
  createdAt: string
  resumeUrl: string | null
  questions: { key: string; label: string }[]
}

interface JobItem {
  id: string
  slug: string
  title: string
  companyName: string | null
  locationText: string
  roleCategory: string
  link: string
  createdAt: string
  applications: AppItem[]
}

export default function RecruiterDashboardPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState<JobItem[] | null>(null)

  const fetchData = async () => {
    if (!email.trim()) return
    setLoading(true)
    setJobs(null)
    try {
      const res = await fetch(
        `/api/dashboard/recruiter?email=${encodeURIComponent(email.trim())}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (
    applicationId: string,
    status: 'SHORTLISTED' | 'DISCARDED'
  ) => {
    try {
      const res = await fetch('/api/dashboard/recruiter/application', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          applicationId,
          status,
        }),
      })
      if (res.ok) fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-indigo-600 hover:underline mb-6 inline-block">
          ← Dashboards
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Recruiter dashboard</h1>
        <p className="text-gray-600 mb-8">
          Enter the email you use for job postings to see your jobs and candidates.
        </p>

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your email
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="recruiter@example.com"
              className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 outline-none"
            />
            <button
              onClick={fetchData}
              disabled={loading || !email.trim()}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Loading…' : 'View'}
            </button>
          </div>
        </div>

        {jobs !== null && (
          <div className="space-y-8">
            {jobs.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-600">
                No jobs found for this email.
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
                    {job.companyName && (
                      <p className="text-gray-600 text-sm">{job.companyName}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {job.locationText} · {job.roleCategory}
                    </p>
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline text-sm mt-2 inline-block"
                    >
                      View job →
                    </a>
                  </div>
                  <div className="p-6">
                    <h3 className="font-medium text-gray-900 mb-4">
                      Candidates ({job.applications.length})
                    </h3>
                    {job.applications.length === 0 ? (
                      <p className="text-gray-500 text-sm">No applications yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {job.applications.map((a) => (
                          <div
                            key={a.id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex flex-wrap justify-between gap-4">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {a.candidateName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {a.candidateEmail}
                                </p>
                                {a.candidatePhone && (
                                  <p className="text-sm text-gray-500">
                                    {a.candidatePhone}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 items-center">
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded ${
                                    a.recruiterStatus === 'SHORTLISTED'
                                      ? 'bg-green-100 text-green-800'
                                      : a.recruiterStatus === 'DISCARDED'
                                      ? 'bg-gray-100 text-gray-600'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {a.recruiterStatus}
                                </span>
                                {a.recruiterStatus === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() =>
                                        updateStatus(a.id, 'SHORTLISTED')
                                      }
                                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                    >
                                      Shortlist
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateStatus(a.id, 'DISCARDED')
                                      }
                                      className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                                    >
                                      Discard
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {a.resumeUrl && (
                              <a
                                href={a.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline text-sm mt-2 inline-block"
                              >
                                CV / Resume
                              </a>
                            )}
                            <details className="mt-3">
                              <summary className="text-sm text-gray-600 cursor-pointer">
                                Q&amp;A
                              </summary>
                              <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-3">
                                {(() => {
                                  try {
                                    const ans = JSON.parse(a.answersJson)
                                    return (
                                      <ul className="space-y-1">
                                        {(a.questions || []).map((q) => (
                                          <li key={q.key}>
                                            <strong>{q.label}</strong>:{' '}
                                            {Array.isArray(ans[q.key])
                                              ? (ans[q.key] as string[]).join(', ')
                                              : String(ans[q.key] ?? '—')}
                                          </li>
                                        ))}
                                      </ul>
                                    )
                                  } catch {
                                    return <pre className="whitespace-pre-wrap">{a.answersJson}</pre>
                                  }
                                })()}
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
