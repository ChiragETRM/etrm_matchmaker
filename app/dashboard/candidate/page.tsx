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
  job: {
    id: string
    slug: string
    title: string
    companyName: string | null
    locationText: string
    roleCategory: string
    link: string
  } | null
  resumeUrl: string | null
}

export default function CandidateDashboardPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [applications, setApplications] = useState<AppItem[] | null>(null)

  const fetchData = async () => {
    if (!email.trim()) return
    setLoading(true)
    setApplications(null)
    try {
      const res = await fetch(
        `/api/dashboard/candidate?email=${encodeURIComponent(email.trim())}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setApplications(data.applications ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-indigo-600 hover:underline mb-6 inline-block">
          ← Dashboards
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Candidate dashboard</h1>
        <p className="text-gray-600 mb-8">
          Enter the email you used for applications to see your activity.
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
              placeholder="you@example.com"
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

        {applications !== null && (
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-600">
                No applications found for this email.
              </div>
            ) : (
              applications.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl shadow p-6"
                >
                  <div className="flex flex-wrap justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {a.job?.title ?? 'Unknown job'}
                      </h2>
                      {a.job?.companyName && (
                        <p className="text-gray-600 text-sm">{a.job.companyName}</p>
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium px-3 py-1 rounded-full ${
                        a.recruiterStatus === 'SHORTLISTED'
                          ? 'bg-green-100 text-green-800'
                          : a.recruiterStatus === 'DISCARDED'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {a.recruiterStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Applied {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                  {a.job?.link && (
                    <a
                      href={a.job.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      View job →
                    </a>
                  )}
                  {a.resumeUrl && (
                    <p className="mt-2">
                      <a
                        href={a.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        Your CV
                      </a>
                    </p>
                  )}
                  <details className="mt-4">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      Questionnaire answers
                    </summary>
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap font-sans">
                        {(() => {
                          try {
                            const o = JSON.parse(a.answersJson)
                            return Object.entries(o)
                              .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`)
                              .join('\n')
                          } catch {
                            return a.answersJson
                          }
                        })()}
                      </pre>
                    </div>
                  </details>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
