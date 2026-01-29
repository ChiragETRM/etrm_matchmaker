'use client'

import { useState, useEffect } from 'react'

const COOKIE_CONSENT_KEY = 'cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if user hasn't consented yet
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    // Also set a cookie so server can read it
    document.cookie = `${COOKIE_CONSENT_KEY}=accepted; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-700 flex-1">
          This site uses strictly necessary cookies for authentication and security.
          We do not use advertising or tracking cookies. By continuing to use this site,
          you acknowledge our use of these essential cookies.
          See our{' '}
          <a href="/cookies" className="text-blue-600 underline hover:text-blue-800">
            Cookie Policy
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 underline hover:text-blue-800">
            Privacy Policy
          </a>.
        </p>
        <button
          onClick={accept}
          className="shrink-0 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
