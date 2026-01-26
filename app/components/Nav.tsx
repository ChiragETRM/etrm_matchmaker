'use client'

import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition"
        >
          Curated Job Engine
        </Link>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <Link
            href="/jobs"
            className="text-gray-600 hover:text-indigo-600 font-medium transition"
          >
            Browse Jobs
          </Link>
          <Link
            href="/filter-jobs"
            className="text-gray-600 hover:text-indigo-600 font-medium transition"
          >
            Filter for me
          </Link>
          <Link
            href="/post-job"
            className="text-gray-600 hover:text-indigo-600 font-medium transition"
          >
            Post Job
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-indigo-600 font-medium transition"
          >
            Dashboards
          </Link>
        </div>
      </div>
    </nav>
  )
}
