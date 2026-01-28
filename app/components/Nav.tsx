'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function Nav() {
  const { data: session, status } = useSession()

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition mr-auto"
        >
          Hand Picked ETRM/CTRM Jobs
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
            Eligible Jobs
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

          {/* Auth Section */}
          {status === 'loading' ? (
            <span className="text-gray-400">...</span>
          ) : session ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-7 h-7 rounded-full"
                  />
                )}
                <span className="text-gray-700 font-medium">
                  {session.user?.name || session.user?.email}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-gray-500 hover:text-red-600 font-medium transition"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
