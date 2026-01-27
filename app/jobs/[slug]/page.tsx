'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { renderSimpleMarkdown } from '@/lib/markdown'
import { daysLeftToApply } from '@/lib/utils'

interface GateRule {
  questionKey: string
  operator: string
  valueJson: string
  orderIndex: number
}

interface Question {
  id: string
  key: string
  label: string
  type: string
  required: boolean
  options: string[] | null
  orderIndex: number
}

interface Questionnaire {
  questions: Question[]
  gateRules: GateRule[]
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
  jdText: string
  createdAt: string
  expiresAt: string
  questionnaire: Questionnaire | null
}

interface GateAnswerModalProps {
  isOpen: boolean
  onClose: () => void
  questions: Question[]
  prefillAnswers: Record<string, any>
  onConfirm: (answers: Record<string, any>) => void
}

function GateAnswerModal({ isOpen, onClose, questions, prefillAnswers, onConfirm }: GateAnswerModalProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(prefillAnswers)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setAnswers(prefillAnswers)
      setErrors({})
    }
  }, [isOpen, prefillAnswers])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    
    questions.forEach((q) => {
      if (q.required && (answers[q.key] === undefined || answers[q.key] === null || answers[q.key] === '')) {
        newErrors[q.key] = 'This field is required'
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onConfirm(answers)
  }

  const updateAnswer = (key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Complete Required Information</h2>
          <p className="text-gray-600 mb-6">
            Please provide the following information to complete your application. This will be saved for future applications.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {q.type === 'BOOLEAN' && (
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={q.key}
                        checked={answers[q.key] === true}
                        onChange={() => updateAnswer(q.key, true)}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={q.key}
                        checked={answers[q.key] === false}
                        onChange={() => updateAnswer(q.key, false)}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                )}
                
                {q.type === 'SINGLE_SELECT' && q.options && (
                  <select
                    value={answers[q.key] || ''}
                    onChange={(e) => updateAnswer(q.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an option</option>
                    {q.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                
                {q.type === 'MULTI_SELECT' && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <label key={opt} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={Array.isArray(answers[q.key]) && answers[q.key].includes(opt)}
                          onChange={(e) => {
                            const current = Array.isArray(answers[q.key]) ? answers[q.key] : []
                            if (e.target.checked) {
                              updateAnswer(q.key, [...current, opt])
                            } else {
                              updateAnswer(q.key, current.filter((v: string) => v !== opt))
                            }
                          }}
                          className="mr-2"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                
                {q.type === 'NUMBER' && (
                  <input
                    type="number"
                    value={answers[q.key] || ''}
                    onChange={(e) => updateAnswer(q.key, e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
                
                {q.type === 'COUNTRY' && (
                  <input
                    type="text"
                    value={answers[q.key] || ''}
                    onChange={(e) => updateAnswer(q.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter country name"
                  />
                )}
                
                {errors[q.key] && (
                  <p className="text-red-500 text-sm mt-1">{errors[q.key]}</p>
                )}
              </div>
            ))}
            
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Confirm & Apply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [oneClickLoading, setOneClickLoading] = useState(false)
  const [showGateModal, setShowGateModal] = useState(false)
  const [gateQuestions, setGateQuestions] = useState<Question[]>([])
  const [prefillAnswers, setPrefillAnswers] = useState<Record<string, any>>({})

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

  const handleOneClickApply = async () => {
    if (!job) return

    // Check if user is signed in
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/jobs/${job.slug}`)}`)
      return
    }

    if (status === 'loading') return

    setOneClickLoading(true)
    try {
      const response = await fetch(`/api/apply/one-click/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (response.status === 401) {
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/jobs/${job.slug}`)}`)
        return
      }

      if (response.status === 200 && data.success) {
        // Application submitted successfully
        router.push(`/dashboard/candidate`)
        return
      }

      if (response.status === 200 && data.requiresGateAnswers) {
        // Need to collect gate answers
        setGateQuestions(data.questions || [])
        setPrefillAnswers(data.prefillAnswers || {})
        setShowGateModal(true)
        setOneClickLoading(false)
        return
      }

      // Error case
      alert(data.error || 'Failed to submit application. Please try again.')
    } catch (error) {
      console.error('Error in one-click apply:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setOneClickLoading(false)
    }
  }

  const handleGateAnswersConfirm = async (answers: Record<string, any>) => {
    if (!job) return

    setOneClickLoading(true)
    try {
      const response = await fetch(`/api/apply/one-click/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateAnswers: answers }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowGateModal(false)
        router.push(`/dashboard/candidate`)
      } else {
        alert(data.error || 'Failed to submit application. Please try again.')
        setOneClickLoading(false)
      }
    } catch (error) {
      console.error('Error submitting gate answers:', error)
      alert('An error occurred. Please try again.')
      setOneClickLoading(false)
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
            <h2 className="text-lg font-semibold mb-2">ETRM Role Details</h2>
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
            <div className="flex gap-4">
              <button
                onClick={handleApply}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
              >
                Apply Now
              </button>
              <button
                onClick={handleOneClickApply}
                disabled={oneClickLoading || status === 'loading'}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
              >
                {oneClickLoading ? 'Processing...' : '1 Click Apply'}
              </button>
            </div>
          </div>

          <GateAnswerModal
            isOpen={showGateModal}
            onClose={() => {
              setShowGateModal(false)
              setOneClickLoading(false)
            }}
            questions={gateQuestions}
            prefillAnswers={prefillAnswers}
            onConfirm={handleGateAnswersConfirm}
          />

          <div className="mt-4 text-sm text-gray-500 text-center">
            {daysLeftToApply(job.expiresAt)}
          </div>
        </div>
      </div>
    </div>
  )
}