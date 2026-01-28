'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
      }) => void
    }
  }
}

export default function SubmitApplicationPage() {
  const params = useParams()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const session = params.session as string

  const { register, handleSubmit, formState: { errors } } = useForm()
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

  // Validate session status before showing form
  useEffect(() => {
    if (session) {
      fetch(`/api/apply/${session}/status`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'PASSED') {
            setSessionValid(true)
          } else if (data.status === 'FAILED') {
            setSessionError('Your application did not meet the minimum requirements for this role.')
            setSessionValid(false)
          } else if (data.status === 'IN_PROGRESS') {
            setSessionError('Please complete the questionnaire before submitting your application.')
            setSessionValid(false)
          } else {
            setSessionError(data.error || 'Invalid session.')
            setSessionValid(false)
          }
        })
        .catch(() => {
          setSessionError('Unable to verify session. Please try again.')
          setSessionValid(false)
        })
    }
  }, [session])

  useEffect(() => {
    if (turnstileSiteKey) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = () => setTurnstileLoaded(true)
      document.body.appendChild(script)

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [turnstileSiteKey])

  const onSubmit = async (data: any) => {
    if (!resumeFile) {
      alert('Please upload your resume')
      return
    }

    // Only require CAPTCHA if configured
    if (turnstileSiteKey && !turnstileToken) {
      alert('Please complete the CAPTCHA')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('resume', resumeFile)
      formData.append('candidateName', data.candidateName)
      formData.append('candidateEmail', data.candidateEmail)
      formData.append('candidatePhone', data.candidatePhone || '')
      formData.append('candidateLinkedin', data.candidateLinkedin || '')
      formData.append('consent', 'true')
      formData.append('turnstileToken', turnstileToken || '')

      const response = await fetch(`/api/apply/${session}/submit`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/apply/${session}/success`)
      } else {
        const error = await response.json()
        alert('Failed to submit application: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF or DOCX file')
        return
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      setResumeFile(file)
    }
  }

  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Unable to Submit</h1>
          <p className="text-gray-600 mb-6">{sessionError}</p>
          <a
            href="/jobs"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Jobs
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-4 sm:p-8 rounded-lg shadow">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Submit Your Application</h1>
            <p className="text-gray-600 mb-8">
              Please provide your contact details and upload your resume.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name *
                </label>
                <input
                  {...register('candidateName', { required: true })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                {errors.candidateName && (
                  <p className="text-red-500 text-sm mt-1">
                    Name is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  {...register('candidateEmail', {
                    required: true,
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                {errors.candidateEmail && (
                  <p className="text-red-500 text-sm mt-1">
                    Valid email is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  {...register('candidatePhone')}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  {...register('candidateLinkedin', {
                    pattern: /^https?:\/\/.*linkedin\.com\/.*/,
                  })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                {errors.candidateLinkedin && (
                  <p className="text-red-500 text-sm mt-1">
                    Please enter a valid LinkedIn URL
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Resume (PDF or DOCX) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                {resumeFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    {...register('consent', {
                      required: true,
                    })}
                    className="mt-1"
                    required
                  />
                  <span className="text-sm">
                    I consent to share my details and resume with the recruiter
                    for this role. *
                  </span>
                </label>
                {errors.consent && (
                  <p className="text-red-500 text-sm mt-1">
                    Consent is required
                  </p>
                )}
              </div>

              <div>
                {turnstileSiteKey && (
                  <div
                    id="turnstile-widget"
                    ref={(el) => {
                      if (el && turnstileLoaded && window.turnstile && !el.hasAttribute('data-rendered')) {
                        el.setAttribute('data-rendered', 'true')
                        window.turnstile.render(el, {
                          sitekey: turnstileSiteKey,
                          callback: (token: string) => setTurnstileToken(token),
                        })
                      }
                    }}
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || (!!turnstileSiteKey && !turnstileToken)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      </div>
  )
}