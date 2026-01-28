'use client'

import { useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface FailedDetail {
  questionKey: string
  questionLabel: string
  operator: string
  expectedValue: any
  actualValue: any
}

function formatFailureMessage(detail: FailedDetail): string {
  const { questionLabel, operator, expectedValue, actualValue } = detail

  switch (operator) {
    case 'EQ':
      return `You answered "${actualValue ?? 'not provided'}", but the requirement is "${expectedValue}".`
    
    case 'GTE':
      return `You have ${actualValue ?? 0} years, but the requirement is at least ${expectedValue} years.`
    
    case 'INCLUDES_ANY':
      const expectedAny = Array.isArray(expectedValue) ? expectedValue.join(' or ') : expectedValue
      const actualAny = Array.isArray(actualValue) ? actualValue.join(', ') : (actualValue ?? 'none')
      return `You selected: ${actualAny}. The requirement is at least one of: ${expectedAny}.`
    
    case 'INCLUDES_ALL':
      const expectedAll = Array.isArray(expectedValue) ? expectedValue.join(' and ') : expectedValue
      const actualAll = Array.isArray(actualValue) ? actualValue.join(', ') : (actualValue ?? 'none')
      return `You selected: ${actualAll}. The requirement is all of: ${expectedAll}.`
    
    case 'IN':
      const expectedIn = Array.isArray(expectedValue) ? expectedValue.join(' or ') : expectedValue
      return `You answered "${actualValue ?? 'not provided'}", but it must be one of: ${expectedIn}.`
    
    default:
      return `Your answer "${actualValue ?? 'not provided'}" does not meet the requirement.`
  }
}

export default function ApplyResultPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const passed = searchParams.get('passed') === 'true'
  const session = pathname?.split('/')[2] || ''
  const [failedDetails, setFailedDetails] = useState<FailedDetail[]>([])
  const [loading, setLoading] = useState(!passed)

  useEffect(() => {
    if (!passed && session) {
      // Fetch failure details from the evaluate endpoint
      // It will return the stored evaluation results for completed sessions
      fetch(`/api/apply/${session}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: {} }), // Empty answers since session is already completed
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.failedDetails) {
            setFailedDetails(data.failedDetails)
          }
        })
        .catch((error) => {
          console.error('Error fetching failure details:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [passed, session])

  if (passed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-2xl w-full bg-white p-5 sm:p-8 rounded-lg shadow text-center">
          <div className="mb-6">
            <div className="text-5xl sm:text-6xl mb-4">✅</div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-green-600">
              Congratulations!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              You meet the minimum requirements for this role.
            </p>
            <p className="text-gray-600 mb-8">
              Please continue to submit your CV and contact details.
            </p>
          </div>
          <Link
            href={`/apply/${session}/submit`}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
          >
            Continue to Submit CV
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow text-center">
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-white p-5 sm:p-8 rounded-lg shadow">
        <div className="mb-6 text-center">
          <div className="text-5xl sm:text-6xl mb-4">😔</div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800">
            This role isn&apos;t a match right now
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Thanks for applying — we&apos;ve had a look and this particular role
            doesn&apos;t match your profile based on the minimum requirements.
          </p>
        </div>

        {failedDetails.length > 0 && (
          <div className="mb-6 text-left">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Here&apos;s where you fell short:
            </h2>
            <div className="space-y-4">
              {failedDetails.map((detail, index) => (
                <div
                  key={detail.questionKey}
                  className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r"
                >
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {detail.questionLabel}
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {formatFailureMessage(detail)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-gray-600 mb-6">
            No worries. We&apos;d love to see you find something that fits. Try
            filtering jobs by your skills, or browse all openings.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/filter-jobs"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Eligible Jobs
            </Link>
            <Link
              href="/jobs"
              className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Browse all jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}