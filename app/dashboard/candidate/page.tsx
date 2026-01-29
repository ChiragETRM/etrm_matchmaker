'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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

interface GateAnswer {
  questionKey: string
  answer: any
  updatedAt: string
}

interface Question {
  key: string
  label: string
  type: 'BOOLEAN' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'NUMBER' | 'COUNTRY'
  options: string[] | null
  orderIndex: number
}

export default function CandidateDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard/candidate')
    }
  }, [status, router])
  const [applications, setApplications] = useState<AppItem[] | null>(null)
  const [gateAnswers, setGateAnswers] = useState<GateAnswer[]>([])
  const [uploading, setUploading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: session?.user?.name || '',
    phone: '',
    linkedin: '',
  })
  const [currentResumeFileId, setCurrentResumeFileId] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [skillsFormValues, setSkillsFormValues] = useState<Record<string, any>>({})
  const [multiSelectValues, setMultiSelectValues] = useState<Record<string, string[]>>({})
  const [savingSkills, setSavingSkills] = useState(false)
  const [skillsSaveSuccess, setSkillsSaveSuccess] = useState(false)

  const email = session?.user?.email || ''

  const fetchData = async () => {
    if (!email) return
    setLoading(true)
    setApplications(null)
    try {
      const res = await fetch('/api/dashboard/candidate', { cache: 'no-store' })
      const data = await res.json()
      setApplications(data.applications ?? [])
      setGateAnswers(data.gateAnswers ?? [])
      // Get profile info from first application if available
      if (data.applications && data.applications.length > 0) {
        const firstApp = data.applications[0]
        setProfileForm(prev => ({
          name: firstApp.candidateName || prev.name || session?.user?.name || '',
          phone: firstApp.candidatePhone || prev.phone || '',
          linkedin: prev.linkedin || '',
        }))
        // Find resume file ID from applications
        const appWithResume = data.applications.find((a: AppItem) => a.resumeUrl)
        if (appWithResume && appWithResume.resumeUrl) {
          const fileIdMatch = appWithResume.resumeUrl.match(/\/api\/files\/([^\/]+)/)
          if (fileIdMatch) {
            setCurrentResumeFileId(fileIdMatch[1])
          }
        }
      } else {
        // If no applications, keep current form values or use session data
        setProfileForm(prev => ({
          name: prev.name || session?.user?.name || '',
          phone: prev.phone || '',
          linkedin: prev.linkedin || '',
        }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Fetch questions for Skills/Experience section
  const fetchQuestions = async () => {
    setQuestionsLoading(true)
    try {
      const res = await fetch('/api/public/filter-questions', { cache: 'no-store' })
      const data = await res.json()
      setQuestions(data.questions ?? [])
    } catch (e) {
      console.error('Error fetching questions:', e)
    } finally {
      setQuestionsLoading(false)
    }
  }

  // Auto-fetch when session is loaded
  useEffect(() => {
    if (status === 'authenticated' && email) {
      fetchData()
      fetchQuestions()
      setProfileForm({
        name: session?.user?.name || '',
        phone: '',
        linkedin: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, email, session?.user?.name])

  // Pre-populate form values when gate answers or questions are loaded
  useEffect(() => {
    if (gateAnswers.length > 0 && questions.length > 0) {
      const formValues: Record<string, any> = {}
      const multiValues: Record<string, string[]> = {}
      
      gateAnswers.forEach((ga) => {
        if (Array.isArray(ga.answer)) {
          multiValues[ga.questionKey] = ga.answer
        } else {
          formValues[ga.questionKey] = ga.answer
        }
      })
      
      setSkillsFormValues(formValues)
      setMultiSelectValues(multiValues)
    }
  }, [gateAnswers, questions])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadSuccess(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'resumes')

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      const data = await res.json()
      setCurrentResumeFileId(data.fileId)

      // Update profile with new resume
      await updateProfile({ resumeFileId: data.fileId })
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload CV. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const updateProfile = async (additionalData?: { resumeFileId?: string }) => {
    setUpdating(true)
    setUpdateSuccess(false)
    try {
      const updateData: any = {}
      if (profileForm.name) updateData.name = profileForm.name
      if (profileForm.phone !== undefined) updateData.phone = profileForm.phone || null
      if (profileForm.linkedin !== undefined) updateData.linkedin = profileForm.linkedin || null
      if (additionalData?.resumeFileId) updateData.resumeFileId = additionalData.resumeFileId

      const res = await fetch('/api/dashboard/candidate/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        throw new Error('Update failed')
      }

      setUpdateSuccess(true)
      setTimeout(() => setUpdateSuccess(false), 3000)
      fetchData() // Refresh to show updated info
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfile()
  }

  const handleSkillsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSkills(true)
    setSkillsSaveSuccess(false)
    
    try {
      // Merge single values and multi-select values
      const allAnswers = { ...skillsFormValues, ...multiSelectValues }
      
      const res = await fetch('/api/dashboard/candidate/gate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: allAnswers }),
      })

      if (!res.ok) {
        throw new Error('Save failed')
      }

      setSkillsSaveSuccess(true)
      setTimeout(() => setSkillsSaveSuccess(false), 3000)
      fetchData() // Refresh to show updated gate answers
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save skills/experience. Please try again.')
    } finally {
      setSavingSkills(false)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center text-gray-500">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-indigo-600 hover:underline mb-6 inline-block">
          ← Dashboards
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Candidate dashboard</h1>
        <p className="text-gray-600 mb-8">
          View your applications and activity. Showing applications for{' '}
          <strong>{email}</strong>.
        </p>

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">{session?.user?.name}</p>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* CV Upload Section */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your CV / Resume</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your latest CV to help with 1-click apply. This will be used for all future applications.
            </p>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium inline-block">
                  {uploading ? 'Uploading...' : currentResumeFileId ? 'Update CV' : 'Upload CV'}
                </span>
              </label>
              {currentResumeFileId && (
                <a
                  href={`/api/files/${currentResumeFileId}/download`}
                  download
                  className="text-indigo-600 hover:underline text-sm"
                >
                  Download current CV →
                </a>
              )}
              {uploadSuccess && (
                <span className="text-sm text-green-600">✓ CV uploaded successfully!</span>
              )}
            </div>
          </div>

          {/* Profile Update Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Update Your Information</h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  id="linkedin"
                  value={profileForm.linkedin}
                  onChange={(e) => setProfileForm({ ...profileForm, linkedin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {updating ? 'Updating...' : 'Update Profile'}
                </button>
                {updateSuccess && (
                  <span className="text-sm text-green-600">✓ Profile updated successfully!</span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Skills / Experience Section */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills / Experience</h3>
          <p className="text-sm text-gray-600 mb-4">
            Update your skills and experience information. This will be used to prepopulate forms when applying to jobs with 1-click apply, helping you apply faster to jobs that match your profile.
          </p>
          
          {questionsLoading ? (
            <div className="text-center text-gray-500 py-8">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No questions available yet. Questions will appear here once jobs are posted with gate requirements.
            </div>
          ) : (
            <form onSubmit={handleSkillsSubmit} className="space-y-5">
              {questions.map((q) => (
                <div key={q.key} className="border-b border-gray-100 pb-4 last:border-0">
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    {q.label}
                  </label>
                  {q.type === 'BOOLEAN' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.key}
                          value="true"
                          checked={skillsFormValues[q.key] === true || skillsFormValues[q.key] === 'true'}
                          onChange={() => setSkillsFormValues({ ...skillsFormValues, [q.key]: true })}
                          className="w-4 h-4"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.key}
                          value="false"
                          checked={skillsFormValues[q.key] === false || skillsFormValues[q.key] === 'false'}
                          onChange={() => setSkillsFormValues({ ...skillsFormValues, [q.key]: false })}
                          className="w-4 h-4"
                        />
                        No
                      </label>
                    </div>
                  )}
                  {q.type === 'SINGLE_SELECT' && (
                    <select
                      value={skillsFormValues[q.key] || ''}
                      onChange={(e) => setSkillsFormValues({ ...skillsFormValues, [q.key]: e.target.value })}
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
                            checked={(multiSelectValues[q.key] ?? []).includes(o)}
                            onChange={(e) => {
                              const prev = multiSelectValues[q.key] ?? []
                              const next = e.target.checked
                                ? [...prev.filter((x) => x !== o), o]
                                : prev.filter((x) => x !== o)
                              setMultiSelectValues((m) => ({ ...m, [q.key]: next }))
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-gray-700">{o}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === 'NUMBER' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(skillsFormValues[q.key] || 0)
                          const newValue = Math.max(0, current - 1)
                          setSkillsFormValues({ ...skillsFormValues, [q.key]: newValue })
                        }}
                        className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-indigo-400 active:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={skillsFormValues[q.key] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') {
                            setSkillsFormValues({ ...skillsFormValues, [q.key]: '' })
                            return
                          }
                          const num = Number(val)
                          if (!isNaN(num) && num >= 0) {
                            setSkillsFormValues({ ...skillsFormValues, [q.key]: num })
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value
                          if (val === '' || Number(val) < 0) {
                            setSkillsFormValues({ ...skillsFormValues, [q.key]: 0 })
                          }
                        }}
                        className="w-24 text-center border-2 border-gray-300 rounded-lg px-3 py-2 text-base font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(skillsFormValues[q.key] || 0)
                          setSkillsFormValues({ ...skillsFormValues, [q.key]: current + 1 })
                        }}
                        className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-indigo-400 active:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                  )}
                  {q.type === 'COUNTRY' && (
                    <input
                      type="text"
                      value={skillsFormValues[q.key] || ''}
                      onChange={(e) => setSkillsFormValues({ ...skillsFormValues, [q.key]: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder="Country"
                    />
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={savingSkills}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {savingSkills ? 'Saving...' : 'Save Skills / Experience'}
                </button>
                {skillsSaveSuccess && (
                  <span className="text-sm text-green-600">✓ Skills/Experience saved successfully!</span>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Saved Gate Answers Section */}
        {gateAnswers.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Saved Application Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              The following information is saved and will be automatically used for 1-click apply. 
              You can update it when applying to new jobs.
            </p>
            <div className="space-y-2">
              {gateAnswers.map((ga) => {
                // Convert snake_case to readable labels
                const label = ga.questionKey
                  .split('_')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
                
                // Format the value nicely
                const displayValue = Array.isArray(ga.answer)
                  ? ga.answer.join(', ')
                  : typeof ga.answer === 'boolean'
                  ? ga.answer ? 'Yes' : 'No'
                  : String(ga.answer)
                
                return (
                  <div key={ga.questionKey} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          (Updated {new Date(ga.updatedAt).toLocaleDateString()})
                        </span>
                      </div>
                      <span className="text-sm text-gray-900 font-semibold">
                        {displayValue}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
                  className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">
                        {a.job?.title ?? 'Unknown job'}
                      </h2>
                      {a.job?.companyName && (
                        <p className="text-gray-600 mb-2">{a.job.companyName}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        Applied on {new Date(a.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${
                        a.recruiterStatus === 'ACCEPTED'
                          ? 'bg-green-100 text-green-800'
                          : a.recruiterStatus === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {a.recruiterStatus || 'PENDING'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-4 pt-4 border-t border-gray-200">
                    {a.job?.link && (
                      <a
                        href={a.job.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 hover:underline text-sm font-medium flex items-center gap-1"
                      >
                        <span>View Job Posting</span>
                        <span>→</span>
                      </a>
                    )}
                    {a.resumeUrl && (
                      <a
                        href={a.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 hover:underline text-sm font-medium flex items-center gap-1"
                      >
                        <span>View Your CV</span>
                        <span>→</span>
                      </a>
                    )}
                  </div>
                  <details className="mt-4">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-2">
                      <span className="text-indigo-600">▼</span>
                      Questionnaire Answers
                    </summary>
                    <div className="mt-3 space-y-2">
                      {(() => {
                        try {
                          const answers = JSON.parse(a.answersJson)
                          return Object.entries(answers).map(([key, value]) => {
                            // Convert snake_case to readable labels
                            const label = key
                              .split('_')
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ')
                            
                            // Format the value nicely
                            let displayValue: string
                            if (Array.isArray(value)) {
                              displayValue = value.join(', ')
                            } else if (typeof value === 'boolean') {
                              displayValue = value ? 'Yes' : 'No'
                            } else {
                              displayValue = String(value)
                            }
                            
                            return (
                              <div
                                key={key}
                                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    {label}
                                  </span>
                                  <span className="text-sm text-gray-900 font-semibold">
                                    {displayValue}
                                  </span>
                                </div>
                              </div>
                            )
                          })
                        } catch {
                          return (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-sm text-gray-600">{a.answersJson}</p>
                            </div>
                          )
                        }
                      })()}
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
