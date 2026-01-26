'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

interface Question {
  id: string
  key: string
  label: string
  type: 'BOOLEAN' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'NUMBER' | 'COUNTRY'
  required: boolean
  options: string[] | null
  orderIndex: number
}

export default function ApplyPage() {
  const params = useParams()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})

  const { register, handleSubmit, watch, setValue } = useForm()

  useEffect(() => {
    if (params.jobId) {
      startApplication(params.jobId as string)
    }
  }, [params.jobId])

  useEffect(() => {
    if (!loading && questions.length === 0 && sessionToken) {
      router.replace(`/apply/${sessionToken}/submit`)
    }
  }, [loading, questions.length, sessionToken, router])

  const startApplication = async (jobId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/apply/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions)
        setSessionToken(data.sessionToken)
      } else {
        alert('Failed to start application')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to start application')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data?: any) => {
    if (!sessionToken) return

    const allAnswers = data || answers

    try {
      const response = await fetch(`/api/apply/${sessionToken}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: allAnswers }),
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/apply/${sessionToken}/result?passed=${result.passed}`)
      } else {
        const errorData = await response.json()
        alert('Failed to evaluate application: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to evaluate application')
    }
  }

  const handleNext = () => {
    const currentQuestion = questions[currentIndex]
    let value = watch(currentQuestion.key)

    // For boolean, convert string to boolean
    if (currentQuestion.type === 'BOOLEAN' && typeof value === 'string') {
      value = value === 'true'
    }

    // For number, ensure it's a number
    if (currentQuestion.type === 'NUMBER' && value) {
      value = Number(value)
    }

    if (currentQuestion.required && (value === undefined || value === null || value === '')) {
      alert('This question is required')
      return
    }

    const updatedAnswers = { ...answers, [currentQuestion.key]: value }
    setAnswers(updatedAnswers)
    setValue(currentQuestion.key, value)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Last question, submit with all answers
      onSubmit(updatedAnswers)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading questionnaire...</div>
      </div>
    )
  }

  if (!loading && questions.length === 0) {
    if (sessionToken) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div>Redirecting to application...</div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to start application.</p>
          <a href="/jobs" className="text-indigo-600 hover:underline">Browse jobs</a>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label className="block text-lg font-medium mb-4">
                {currentQuestion.label}
                {currentQuestion.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>

              {currentQuestion.type === 'BOOLEAN' && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="true"
                      {...register(currentQuestion.key, {
                        required: currentQuestion.required,
                      })}
                      defaultChecked={answers[currentQuestion.key] === true}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="false"
                      {...register(currentQuestion.key, {
                        required: currentQuestion.required,
                      })}
                      defaultChecked={answers[currentQuestion.key] === false}
                    />
                    No
                  </label>
                </div>
              )}

              {currentQuestion.type === 'SINGLE_SELECT' && (
                <select
                  {...register(currentQuestion.key, {
                    required: currentQuestion.required,
                  })}
                  className="w-full border rounded px-3 py-2"
                  defaultValue={answers[currentQuestion.key] || ''}
                >
                  <option value="">Select an option</option>
                  {currentQuestion.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {currentQuestion.type === 'MULTI_SELECT' && (
                <div className="space-y-2">
                  {currentQuestion.options?.map((option) => {
                    const currentValue = answers[currentQuestion.key] || []
                    const isChecked = Array.isArray(currentValue) && currentValue.includes(option)
                    return (
                      <label key={option} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = answers[currentQuestion.key] || []
                            if (e.target.checked) {
                              const newValue = [...current, option]
                              setAnswers({
                                ...answers,
                                [currentQuestion.key]: newValue,
                              })
                              setValue(currentQuestion.key, newValue)
                            } else {
                              const newValue = current.filter(
                                (v: string) => v !== option
                              )
                              setAnswers({
                                ...answers,
                                [currentQuestion.key]: newValue,
                              })
                              setValue(currentQuestion.key, newValue)
                            }
                          }}
                        />
                        {option}
                      </label>
                    )
                  })}
                </div>
              )}

              {currentQuestion.type === 'NUMBER' && (
                <input
                  type="number"
                  {...register(currentQuestion.key, {
                    required: currentQuestion.required,
                    valueAsNumber: true,
                  })}
                  className="w-full border rounded px-3 py-2"
                  defaultValue={answers[currentQuestion.key] || ''}
                />
              )}

              {currentQuestion.type === 'COUNTRY' && (
                <input
                  type="text"
                  {...register(currentQuestion.key, {
                    required: currentQuestion.required,
                  })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter country name"
                  defaultValue={answers[currentQuestion.key] || ''}
                />
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {currentIndex === questions.length - 1 ? 'Submit' : 'Next'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}