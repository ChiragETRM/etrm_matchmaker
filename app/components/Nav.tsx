'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function Nav() {
  const { data: session, status } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition shrink-0"
        >
          ETRM Match Maker
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm">
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

          {/* Auth Section - Desktop */}
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

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 -mr-2 rounded-lg hover:bg-gray-100 transition"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
            >
              Browse Jobs
            </Link>
            <Link
              href="/filter-jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
            >
              Eligible Jobs
            </Link>
            <Link
              href="/post-job"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
            >
              Post Job
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
            >
              Dashboards
            </Link>

            {/* Auth Section - Mobile */}
            <div className="pt-2 mt-2 border-t border-gray-100">
              {status === 'loading' ? (
                <span className="block px-3 py-2 text-gray-400">...</span>
              ) : session ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {session.user?.image && (
                      <img
                        src={session.user.image}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="text-gray-700 font-medium text-sm">
                      {session.user?.name || session.user?.email}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      signOut({ callbackUrl: '/' })
                    }}
                    className="block w-full text-left px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition text-center"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
