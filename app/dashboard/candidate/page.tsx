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

  const email = session?.user?.email || ''

  const fetchData = async () => {
    if (!email) return
    setLoading(true)
    setApplications(null)
    try {
      const res = await fetch('/api/dashboard/candidate', { cache: 'no-store' })
      const data = await res.json()
      setApplications(data.applications ?? [])
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

  // Auto-fetch when session is loaded
  useEffect(() => {
    if (status === 'authenticated' && email) {
      fetchData()
      setProfileForm({
        name: session?.user?.name || '',
        phone: '',
        linkedin: '',
      })
    }
  }, [status, email, session?.user?.name])

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
                  href={`/api/files/${currentResumeFileId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline text-sm"
                >
                  View current CV →
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
