import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Hand Picked ETRM/CTRM Jobs
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">
            ETRM-focused job portal
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-4">
            Built by ETRM people for ETRM people
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* For Recruiters */}
          <Link
            href="/post-job"
            className="group relative overflow-hidden bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
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
                <p className="text-gray-600 leading-relaxed mb-4">
                  Post ETRM-focused jobs. No accounts needed.
                </p>
                <ul className="space-y-4 mb-6 border-t border-gray-100 pt-4">
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      Zero noise, only qualified profiles
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Candidates are screened on ETRM skills before CV submission. You see only people who meet your minimum bar.
                    </p>
                  </li>
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      Built specifically for ETRM roles
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Endur, Allegro, RightAngle, commodities, markets, modules — all first-class fields, not afterthoughts.
                    </p>
                  </li>
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      No ATS pain, no setup cost
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Post a job, define requirements, receive shortlisted candidates by email. No tools to learn.
                    </p>
                  </li>
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      Faster hiring decisions
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Every CV comes with structured answers to your key questions. Less guessing, fewer calls.
                    </p>
                  </li>
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      Clean, time-boxed postings
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Jobs auto-expire in 30 days. No stale roles, no clutter, no awkward takedowns.
                    </p>
                  </li>
                </ul>
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
            <div className="relative p-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
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
                <p className="text-gray-600 leading-relaxed mb-4">
                  Browse curated ETRM opportunities.
                </p>
                <ul className="space-y-4 mb-6 border-t border-gray-100 pt-4 mt-4">
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      No wasted applications
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      If you don&apos;t meet the requirements, you find out immediately. If you do, your CV goes straight to the recruiter.
                    </p>
                  </li>
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      Real ETRM jobs, properly described
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Clear systems, commodities, seniority, and expectations. No vague &quot;finance tech&quot; nonsense.
                    </p>
                  </li>
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      No account creation mandatory
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Browse jobs, answer questions, upload CV. That&apos;s it.
                    </p>
                  </li>
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      Fair screening, skill-first
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Everyone answers the same questions. You&apos;re judged on experience, not buzzwords or CV styling.
                    </p>
                  </li>
                  <li className="pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 mb-1.5 text-base">
                      Faster responses, less ghosting
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Recruiters only see qualified candidates, so they actually respond.
                    </p>
                  </li>
                </ul>
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

        {/* Features */}
        <div className="mt-16 text-center space-y-4">
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