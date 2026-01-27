'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface GateRule {
  type: 'years_experience' | 'language' | 'commodity' | 'work_permit' | 'other'
  years?: number
  packages?: string[]
  customPackageName?: string
  languages?: string[]
  commodities?: string[]
  country?: string
  otherText?: string
  orderIndex: number
}

const ETRM_PACKAGES = ['Endur', 'Allegro', 'RightAngle', 'Trayport', 'Other']
const LANGUAGES = ['German', 'French', 'Spanish', 'Korean', 'Italian', 'Chinese']
const COMMODITIES = ['Power', 'Gas', 'LNG', 'Oil', 'Refined Products', 'Emissions', 'Coal', 'Freight']
const COUNTRIES = [
  'United Kingdom', 'United States', 'Germany', 'France', 'Spain', 'Italy',
  'Netherlands', 'Switzerland', 'Singapore', 'Japan', 'Australia', 'Canada',
  'Other'
]

const BOILERPLATE_JD = {
  ETRM_BA: `ETRM Business Analyst (**Endur**)

**Role Summary**
You sit between traders, operations, risk, and IT. Your job is to translate how money is made (and lost) into how **Endur** behaves.

**Key Responsibilities**
• Gather and document front-to-back trading requirements (deal capture → **PnL** → settlement).
• Configure **Endur** workflows for physical and financial trades.
• Define **PnL**, risk, and position reporting requirements.
• Support **UAT**, defect triage, and production issues.
• Work with developers on functional specs and solution design.
• Support regulatory and compliance reporting where required.

**Required Skills**
• Hands-on **Endur** experience as a BA.
• Strong understanding of energy trading workflows (power, gas, oil, LNG, emissions).
• Solid grasp of trade lifecycle, confirmations, settlements, and accounting.
• Comfortable speaking to traders and control functions.
• **SQL** for data validation and analysis.

**Nice to Have**
• Exposure to **MiFID II** / **REMIT** / **EMIR**.
• Experience with exchange-traded products (**ICE**, **EEX**, **CME**).
• Prior implementation or upgrade projects.`,
  ETRM_DEV: `ETRM Developer (**Endur**)

**Role Summary**
You build, customize, and extend **Endur**. When configuration hits its limits, you write code.

**Key Responsibilities**
• Develop and maintain **Endur** customizations (**JVS** / **OpenJVS**).
• Build interfaces to exchanges, schedulers, and downstream systems.
• Develop custom reports, scripts, and automation.
• Optimize performance and resolve production issues.
• Support **Endur** upgrades and patches.
• Collaborate with BAs and testers during delivery and go-live.

**Required Skills**
• Strong **Endur** development experience.
• Proficiency in **OpenJVS** / **JVS**.
• Solid **SQL** and database knowledge (**Oracle**).
• Understanding of **Endur** data model and transaction objects.
• Experience with version control and deployment processes.

**Nice to Have**
• **Java**, **Python**, or scripting outside **Endur**.
• Experience with market data feeds and trade capture interfaces.
• Cloud or modern data platform exposure.`,
  ETRM_TESTER: `ETRM Tester / QA Analyst (**Endur**)

**Role Summary**
You break things before traders do. You make sure **Endur** behaves exactly as the desk expects—no surprises on day one.

**Key Responsibilities**
• Design and execute test cases for **Endur** configurations and customizations.
• Perform system, integration, and **UAT** testing.
• Validate trade lifecycle, **PnL**, risk, settlements, and reports.
• Reconcile **Endur** outputs with expected business results.
• Log, track, and retest defects.
• Support regression testing for upgrades and fixes.

**Required Skills**
• Hands-on **Endur** testing experience.
• Strong understanding of trading workflows and **PnL** logic.
• Experience validating reports and data outputs.
• Attention to detail and structured testing approach.
• Ability to work closely with BAs and developers.

**Nice to Have**
• Automation testing exposure.
• **SQL** for data validation.
• Prior front-office or operations exposure.`
}

export default function PostJobPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [budgetValue, setBudgetValue] = useState(150)

  // No auth required - allow posting jobs without signing in

  const { register, handleSubmit, control, watch, setValue } = useForm({
    defaultValues: {
      title: '',
      companyName: '',
      locationText: '',
      countryCode: '',
      remotePolicy: 'REMOTE' as const,
      contractType: 'PERM' as const,
      experienceRange: '2-5' as const,
      roleCategory: 'ETRM_DEV' as const,
      roleCategoryOther: '',
      etrmPackages: [] as string[],
      commodityTags: [] as string[],
      budget: '150000',
      budgetCurrency: 'USD',
      budgetIsEstimate: false,
      jdText: '',
      recruiterEmailTo: '',
      gateRules: [] as GateRule[],
    },
  })

  // Set recruiter email from session when authenticated (optional)
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      setValue('recruiterEmailTo', session.user.email)
    }
  }, [status, session, setValue])

  const {
    fields: gateRuleFields,
    append: appendGateRule,
    remove: removeGateRule,
  } = useFieldArray({ control, name: 'gateRules' })

  const roleCategory = watch('roleCategory') as 'ETRM_BA' | 'ETRM_DEV' | 'ETRM_TESTER' | 'TRADING_INFRA' | 'DATA_INTEGRATION' | 'QUANT_ANALYST' | 'OTHER'
  const etrmPackages = watch('etrmPackages')

  const addGateRule = (type: GateRule['type']) => {
    const orderIndex = gateRuleFields.length
    const baseRule: any = { type, orderIndex }
    
    if (type === 'years_experience') {
      baseRule.years = 2
      baseRule.packages = []
      baseRule.customPackageName = ''
    } else if (type === 'language') {
      baseRule.languages = []
    } else if (type === 'commodity') {
      baseRule.commodities = []
    } else if (type === 'work_permit') {
      baseRule.country = ''
    }
    
    appendGateRule(baseRule)
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      // Convert experience range to seniority for backward compatibility
      let seniority = 'MID'
      if (data.experienceRange === '0-2') seniority = 'JUNIOR'
      else if (data.experienceRange === '2-5') seniority = 'MID'
      else if (data.experienceRange === '5+') seniority = 'SENIOR'

      // Process gate rules into questions and gate rules
      const questions: any[] = []
      const processedGateRules: any[] = []
      let questionIndex = 0

      data.gateRules.forEach((rule: GateRule, index: number) => {
        if (rule.type === 'years_experience' && rule.packages && rule.packages.length > 0) {
          rule.packages.forEach((pkg) => {
            // Use custom package name if "Other" is selected and custom name is provided
            const packageName = pkg === 'Other' && rule.customPackageName ? rule.customPackageName : pkg
            const questionKey = `years_${packageName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`
            questions.push({
              key: questionKey,
              label: `How many years of hands-on ${packageName} experience do you have?`,
              type: 'NUMBER',
              required: true,
              options: null,
              orderIndex: questionIndex++,
            })
            processedGateRules.push({
              questionKey,
              operator: 'GTE',
              value: rule.years || 2,
              orderIndex: index,
            })
          })
        } else if (rule.type === 'language' && rule.languages && rule.languages.length > 0) {
          const questionKey = 'languages'
          questions.push({
            key: questionKey,
            label: 'Which languages do you speak? (Select all that apply)',
            type: 'MULTI_SELECT',
            required: true,
            options: ['English', ...LANGUAGES],
            orderIndex: questionIndex++,
          })
          processedGateRules.push({
            questionKey,
            operator: 'INCLUDES_ANY',
            value: rule.languages,
            orderIndex: index,
          })
        } else if (rule.type === 'commodity' && rule.commodities && rule.commodities.length > 0) {
          const questionKey = 'commodities'
          questions.push({
            key: questionKey,
            label: 'Which commodity markets do you have strong domain knowledge in?',
            type: 'MULTI_SELECT',
            required: true,
            options: COMMODITIES,
            orderIndex: questionIndex++,
          })
          processedGateRules.push({
            questionKey,
            operator: 'INCLUDES_ANY',
            value: rule.commodities,
            orderIndex: index,
          })
        } else if (rule.type === 'work_permit' && rule.country) {
          const questionKey = 'work_permit_country'
          questions.push({
            key: questionKey,
            label: `Do you have a legal work permit for ${rule.country}?`,
            type: 'BOOLEAN',
            required: true,
            options: null,
            orderIndex: questionIndex++,
          })
          processedGateRules.push({
            questionKey,
            operator: 'EQ',
            value: true,
            orderIndex: index,
          })
        } else if (rule.type === 'other' && rule.otherText) {
          // For "other" requirements, we'll create a simple boolean question
          const questionKey = `other_requirement_${index}`
          questions.push({
            key: questionKey,
            label: rule.otherText,
            type: 'BOOLEAN',
            required: true,
            options: null,
            orderIndex: questionIndex++,
          })
          processedGateRules.push({
            questionKey,
            operator: 'EQ',
            value: true,
            orderIndex: index,
          })
        }
      })

      const payload = {
        ...data,
        seniority,
        roleCategory: data.roleCategory === 'OTHER' ? data.roleCategoryOther : data.roleCategory,
        budgetMin: parseFloat(data.budget),
        budgetMax: parseFloat(data.budget),
        budgetPeriod: 'ANNUAL' as const,
        recruiterEmailCc: [],
        emailSubjectPrefix: '',
        questions,
        gateRules: processedGateRules,
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        router.push(`/post-job/success?slug=${result.job.slug}&expiresAt=${result.job.expiresAt}`)
      } else {
        // Show detailed error message
        let errorMsg = result.error || 'Unknown error'
        if (result.details && Array.isArray(result.details)) {
          const validationErrors = result.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join('\n')
          errorMsg = `Validation errors:\n${validationErrors}`
        }
        alert('Failed to create job: ' + errorMsg)
        console.error('Job creation error:', result)
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network error. Please check your connection and try again.'
      alert('Failed to create job: ' + errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // No auth required - show form immediately

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Post a Job
          </h1>
          <p className="text-gray-600">Create your ETRM job posting in minutes</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Job Basics */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Job Basics</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Job Title *
                </label>
                <input
                  {...register('title', { required: true })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="e.g., Senior Endur Developer"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Company Name
                </label>
                <input
                  {...register('companyName')}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Location *
                </label>
                <input
                  {...register('locationText', { required: true })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="e.g., London, UK"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Remote Policy *
                  </label>
                  <select
                    {...register('remotePolicy', { required: true })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  >
                    <option value="ONSITE">Onsite</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Contract Type *
                  </label>
                  <select
                    {...register('contractType', { required: true })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  >
                    <option value="PERM">Permanent</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Years of Experience *
                </label>
                <select
                  {...register('experienceRange', { required: true })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                >
                  <option value="0-2">0-2 years</option>
                  <option value="2-5">2-5 years</option>
                  <option value="5+">5+ years</option>
                </select>
              </div>
            </div>
          </section>

          {/* ETRM Role Details */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">ETRM Role Details</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Role *
                </label>
                <select
                  {...register('roleCategory', { required: true })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                >
                  <option value="ETRM_BA">ETRM Business Analyst</option>
                  <option value="ETRM_DEV">ETRM Developer</option>
                  <option value="ETRM_TESTER">ETRM Tester</option>
                  <option value="TRADING_INFRA">Trading Infrastructure</option>
                  <option value="DATA_INTEGRATION">Data Integration</option>
                  <option value="QUANT_ANALYST">Quantitative Analyst</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {roleCategory === 'OTHER' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Please specify the role *
                  </label>
                  <input
                    {...register('roleCategoryOther', { required: roleCategory === 'OTHER' })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                    placeholder="Enter role name"
                    required={roleCategory === 'OTHER'}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  ETRM Packages
                </label>
                <div className="flex flex-wrap gap-3">
                  {ETRM_PACKAGES.map((pkg) => (
                    <label
                      key={pkg}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        value={pkg}
                        checked={etrmPackages.includes(pkg)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setValue('etrmPackages', [...etrmPackages, pkg])
                          } else {
                            setValue(
                              'etrmPackages',
                              etrmPackages.filter((p) => p !== pkg)
                            )
                          }
                        }}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                        {pkg}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Commodity Focus
                </label>
                <div className="flex flex-wrap gap-3">
                  {COMMODITIES.map((commodity) => (
                    <label
                      key={commodity}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        value={commodity}
                        {...register('commodityTags')}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                        {commodity}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Budget */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Max Budget *</h2>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Budget Amount
                  </label>
                  <span className="text-lg font-bold text-blue-600">
                    {budgetValue.toLocaleString()}k {watch('budgetCurrency')}
                  </span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="300"
                  step="10"
                  value={budgetValue}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    setBudgetValue(value)
                    setValue('budget', (value * 1000).toString())
                  }}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((budgetValue - 70) / (300 - 70)) * 100}%, #e5e7eb ${((budgetValue - 70) / (300 - 70)) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>70k</span>
                  <span>185k</span>
                  <span>300k</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Currency *
                </label>
                <select
                  {...register('budgetCurrency', { required: true })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                >
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register('budgetIsEstimate')}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-700 group-hover:text-gray-900">
                  This is an estimated budget
                </span>
              </label>
            </div>
          </section>

          {/* Job Description */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Job Description *</h2>
              <p className="text-sm text-gray-500 mb-4">
                Use a standard boilerplate or write your own custom description
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (BOILERPLATE_JD.ETRM_BA) {
                      setValue('jdText', BOILERPLATE_JD.ETRM_BA)
                    }
                  }}
                  className="px-4 py-2 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium text-gray-700"
                >
                  ETRM BA Boilerplate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (BOILERPLATE_JD.ETRM_DEV) {
                      setValue('jdText', BOILERPLATE_JD.ETRM_DEV)
                    }
                  }}
                  className="px-4 py-2 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium text-gray-700"
                >
                  ETRM Developer Boilerplate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (BOILERPLATE_JD.ETRM_TESTER) {
                      setValue('jdText', BOILERPLATE_JD.ETRM_TESTER)
                    }
                  }}
                  className="px-4 py-2 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium text-gray-700"
                >
                  ETRM Tester Boilerplate
                </button>
              </div>
            </div>
            <textarea
              {...register('jdText', { required: true })}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none font-mono text-sm"
              rows={12}
              placeholder="Describe the role, responsibilities, and requirements. Use **text** for bold."
              required
            />
          </section>

          {/* Minimum Requirements */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Minimum Requirements</h2>
              <p className="text-sm text-gray-500 mt-1">
                Set hard requirements that candidates must meet to apply
              </p>
            </div>

            {/* Add Requirement Buttons */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => addGateRule('years_experience')}
                className="px-4 py-3 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium"
              >
                + Years of Experience
              </button>
              <button
                type="button"
                onClick={() => addGateRule('language')}
                className="px-4 py-3 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium"
              >
                + Language Requirement
              </button>
              <button
                type="button"
                onClick={() => addGateRule('commodity')}
                className="px-4 py-3 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium"
              >
                + Commodity Knowledge
              </button>
              <button
                type="button"
                onClick={() => addGateRule('work_permit')}
                className="px-4 py-3 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium"
              >
                + Work Permit
              </button>
              <button
                type="button"
                onClick={() => addGateRule('other')}
                className="px-4 py-3 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium col-span-2"
              >
                + Any Other Requirement
              </button>
            </div>

            {/* Active Requirements */}
            <div className="space-y-5">
              {gateRuleFields.map((field, index) => {
                const rule = watch(`gateRules.${index}`)
                
                return (
                  <div
                    key={field.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all bg-white"
                  >
                    <div className="flex justify-between items-start gap-6">
                      <div className="flex-1">
                        {rule.type === 'years_experience' && (
                          <div className="text-base font-medium text-gray-800 leading-relaxed">
                            <span className="mr-2">Minimum</span>
                            <select
                              {...register(`gateRules.${index}.years` as const)}
                              className="inline-block border-2 border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white min-w-[90px] mx-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                              defaultValue={rule.years || 2}
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                            <span className="mx-2">Years of Hands-On</span>
                            <div className="inline-flex flex-wrap gap-2.5 items-center mt-2 ml-0">
                              {ETRM_PACKAGES.map((pkg) => (
                                <label 
                                  key={pkg} 
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all cursor-pointer ${
                                    rule.packages?.includes(pkg)
                                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={rule.packages?.includes(pkg) || false}
                                    onChange={(e) => {
                                      const current = rule.packages || []
                                      if (e.target.checked) {
                                        setValue(`gateRules.${index}.packages` as const, [...current, pkg])
                                        if (pkg === 'Other') {
                                          setValue(`gateRules.${index}.customPackageName` as const, '')
                                        }
                                      } else {
                                        setValue(`gateRules.${index}.packages` as const, current.filter((p: string) => p !== pkg))
                                        if (pkg === 'Other') {
                                          setValue(`gateRules.${index}.customPackageName` as const, '')
                                        }
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium">{pkg}</span>
                                </label>
                              ))}
                            </div>
                            {rule.packages?.includes('Other') && (
                              <div className="mt-3 ml-0">
                                <input
                                  type="text"
                                  {...register(`gateRules.${index}.customPackageName` as const)}
                                  placeholder="Please specify the ETRM package"
                                  className="border-2 border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-w-[200px]"
                                  defaultValue={rule.customPackageName || ''}
                                />
                              </div>
                            )}
                            <span className="ml-2">Experience</span>
                          </div>
                        )}

                        {rule.type === 'language' && (
                          <div className="text-base font-medium text-gray-800 leading-relaxed">
                            <span className="mr-2">Apart from English, mandatory to speak</span>
                            <div className="inline-flex flex-wrap gap-2.5 items-center mt-2 ml-0">
                              {LANGUAGES.map((lang) => (
                                <label 
                                  key={lang} 
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all cursor-pointer ${
                                    rule.languages?.includes(lang)
                                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={rule.languages?.includes(lang) || false}
                                    onChange={(e) => {
                                      const current = rule.languages || []
                                      if (e.target.checked) {
                                        setValue(`gateRules.${index}.languages` as const, [...current, lang])
                                      } else {
                                        setValue(`gateRules.${index}.languages` as const, current.filter((l: string) => l !== lang))
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium">{lang}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {rule.type === 'commodity' && (
                          <div className="text-base font-medium text-gray-800 leading-relaxed">
                            <span className="mr-2">Strong domain knowledge of</span>
                            <div className="inline-flex flex-wrap gap-2.5 items-center mt-2 ml-0">
                              {COMMODITIES.map((commodity) => (
                                <label 
                                  key={commodity} 
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all cursor-pointer ${
                                    rule.commodities?.includes(commodity)
                                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={rule.commodities?.includes(commodity) || false}
                                    onChange={(e) => {
                                      const current = rule.commodities || []
                                      if (e.target.checked) {
                                        setValue(`gateRules.${index}.commodities` as const, [...current, commodity])
                                      } else {
                                        setValue(`gateRules.${index}.commodities` as const, current.filter((c: string) => c !== commodity))
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium">{commodity}</span>
                                </label>
                              ))}
                            </div>
                            <span className="ml-2">market(s)</span>
                          </div>
                        )}

                        {rule.type === 'work_permit' && (
                          <div className="text-base font-medium text-gray-800 leading-relaxed flex items-center gap-3 flex-wrap">
                            <span>Should have a legal work permit for</span>
                            <select
                              {...register(`gateRules.${index}.country` as const, { required: true })}
                              className="border-2 border-gray-300 rounded-lg px-4 py-2 text-sm bg-white min-w-[180px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                              defaultValue={rule.country || ''}
                            >
                              <option value="">Select country</option>
                              {COUNTRIES.map((country) => (
                                <option key={country} value={country}>{country}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {rule.type === 'other' && (
                          <div className="text-base font-medium text-gray-800">
                            <div className="mb-3">Any other - please specify what is a hard-gate for your role.</div>
                            <textarea
                              {...register(`gateRules.${index}.otherText` as const, { required: true })}
                              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                              rows={3}
                              placeholder="Please specify what is a hard-gate for your role"
                              defaultValue={rule.otherText || ''}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGateRule(index)}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-bold text-xl"
                        title="Remove requirement"
                      >
                        −
                      </button>
                    </div>
                  </div>
                )
              })}
              {gateRuleFields.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No requirements added yet. Click the buttons above if you want to add hard limits.</p>
                  <p className="text-sm font-medium text-amber-600">Be careful though! ETRM is a niche market! Harder the limits, fewer candidates!</p>
                </div>
              )}
            </div>
          </section>

          {/* Your Email */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Email</h2>
            {session?.user && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-sm text-gray-600">Signed in with Google</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Your Email *
              </label>
              <input
                type="email"
                {...register('recruiterEmailTo', { required: true })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="your.email@example.com"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                Candidates will be notified to this email address.
              </p>
            </div>
          </section>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            {isSubmitting ? 'Creating Job...' : 'Create Job Posting'}
          </button>
        </form>
      </div>
    </div>
  )
}