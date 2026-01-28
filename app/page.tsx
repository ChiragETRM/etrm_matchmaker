import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center px-4 py-8 sm:p-8">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ETRM Match Maker
          </h1>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto mb-2">
            ETRM-focused job portal
          </p>
          <p className="text-sm sm:text-lg text-gray-500 max-w-2xl mx-auto mb-4">
            Built by ETRM people for ETRM people
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* For Recruiters */}
          <Link
            href="/post-job"
            className="group relative overflow-hidden bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 sm:p-8">
              <div className="mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  For Recruiters
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Post ETRM-focused jobs with custom questionnaires and automated candidate screening. No accounts needed.
                </p>
              </div>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Get Started
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* For Candidates */}
          <Link
            href="/jobs"
            className="group relative overflow-hidden bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 sm:p-8">
              <div className="mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  For Candidates
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Browse curated ETRM opportunities. Complete quick questionnaires and apply directly to roles that match your skills.
                </p>
              </div>
              <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Browse Jobs
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Reasons Sections */}
        <div className="mt-10 sm:mt-20 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* For Recruiters - Reasons */}
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              For Recruiters — 5 reasons to post here
            </h3>
            <div className="space-y-5">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  1. Zero noise, only qualified profiles
                </h4>
                <p className="text-sm text-gray-600">
                  Candidates are screened on ETRM skills before CV submission. You see only people who meet your minimum bar.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  2. Built specifically for ETRM roles
                </h4>
                <p className="text-sm text-gray-600">
                  Endur, Allegro, RightAngle, commodities, markets, modules — all first-class fields, not afterthoughts.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  3. No ATS pain, no setup cost
                </h4>
                <p className="text-sm text-gray-600">
                  Post a job, define requirements, receive shortlisted candidates by email. No tools to learn.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  4. Faster hiring decisions
                </h4>
                <p className="text-sm text-gray-600">
                  Every CV comes with structured answers to your key questions. Less guessing, fewer calls.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  5. Clean, time-boxed postings
                </h4>
                <p className="text-sm text-gray-600">
                  Jobs auto-expire in 30 days. No stale roles, no clutter, no awkward takedowns.
                </p>
              </div>
            </div>
          </div>

          {/* For Candidates - Reasons */}
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              For Candidates — 5 reasons to apply here
            </h3>
            <div className="space-y-5">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  1. No wasted applications
                </h4>
                <p className="text-sm text-gray-600">
                  If you don&apos;t meet the requirements, you find out immediately. If you do, your CV goes straight to the recruiter.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  2. Real ETRM jobs, properly described
                </h4>
                <p className="text-sm text-gray-600">
                  Clear systems, commodities, seniority, and expectations. No vague &quot;finance tech&quot; nonsense.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  3. No account creation
                </h4>
                <p className="text-sm text-gray-600">
                  Browse jobs, answer questions, upload CV. That&apos;s it.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  4. Fair screening, skill-first
                </h4>
                <p className="text-sm text-gray-600">
                  Everyone answers the same questions. You&apos;re judged on experience, not buzzwords or CV styling.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  5. Faster responses, less ghosting
                </h4>
                <p className="text-sm text-gray-600">
                  Recruiters only see qualified candidates, so they actually respond.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-10 sm:mt-16 text-center space-y-4">
          <p className="text-sm text-gray-500">
            Instant job posting • Quick application process
          </p>
          <Link
            href="/dashboard"
            className="inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Candidate &amp; Recruiter dashboards →
          </Link>
        </div>
      </div>
    </main>
  )
}