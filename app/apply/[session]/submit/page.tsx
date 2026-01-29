'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { PHONE_COUNTRIES, formatPhone } from '@/lib/phone-country'

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
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState('US')
  const [phoneNational, setPhoneNational] = useState('')
  const session = params.session as string

  const { register, handleSubmit, formState: { errors }, setError } = useForm()
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
      const fullPhone = formatPhone(phoneCountryCode, phoneNational)
      if (!fullPhone.trim()) {
        setError('candidatePhone', { type: 'required', message: 'Phone number is required' })
        setIsSubmitting(false)
        return
      }
      const formData = new FormData()
      formData.append('resume', resumeFile)
      formData.append('candidateName', data.candidateName)
      formData.append('candidateEmail', data.candidateEmail)
      formData.append('candidatePhone', fullPhone)
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-3xl font-bold mb-6">Submit Your Application</h1>
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
                  Phone *
                </label>
                <div className="flex gap-2">
                  <select
                    id="phone-country"
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="w-[140px] shrink-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    aria-label="Country code"
                  >
                    {PHONE_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.dialCode ? `${c.dialCode} ${c.code}` : c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNational}
                    onChange={(e) => setPhoneNational(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={phoneCountryCode === 'OTHER' ? 'e.g. +44 20 7123 4567' : '234 567 8900'}
                    aria-label="Phone number"
                    required
                  />
                </div>
                {errors.candidatePhone && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.candidatePhone.message as string}
                  </p>
                )}
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
                    I consent to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      key terms and conditions
                    </button>
                    {' '}for applying for this role. *
                  </span>
                </label>
                {errors.consent && (
                  <p className="text-red-500 text-sm mt-1">
                    Consent is required
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2 ml-6">
                  By proceeding, you provide explicit consent for the above terms.
                </p>
              </div>

              {showTermsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">Key Terms and Conditions</h2>
                      <button
                        onClick={() => setShowTermsModal(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                      >
                        ×
                      </button>
                    </div>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h3 className="font-semibold mb-2">Job alerts & communication</h3>
                        <p className="text-gray-700">
                          I consent to receive role-relevant job alerts and application-related communication from the LearnETRM job platform.
                          I understand that I can unsubscribe at any time.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Role-specific representation</h3>
                        <p className="text-gray-700">
                          I authorize LearnETRM to represent my profile solely for this specific position and only for the duration of this recruitment process.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Accuracy of information</h3>
                        <p className="text-gray-700">
                          I confirm that all information provided by me, including my CV and application responses, is accurate and complete to the best of my knowledge.
                          I understand that any material misrepresentation may result in my application being withdrawn.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Data sharing with the hiring party</h3>
                        <p className="text-gray-700">
                          I consent to my application details being shared with the hiring company and its authorized recruiters strictly for evaluation of this role.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">No employment guarantee</h3>
                        <p className="text-gray-700">
                          I understand that submitting an application does not guarantee interviews, shortlisting, or employment, and that hiring decisions rest solely with the employer.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Duplicate or parallel applications</h3>
                        <p className="text-gray-700">
                          I confirm that I have not authorized any other recruiter or platform to represent me for this same role, unless explicitly disclosed to LearnETRM.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Data retention</h3>
                        <p className="text-gray-700">
                          I understand that my application data will be retained for a limited period in line with LearnETRM&apos;s data retention and privacy practices.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Governing framework</h3>
                        <p className="text-gray-700">
                          These consents are governed by applicable data protection and employment laws, including GDPR where applicable.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowTermsModal(false)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

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