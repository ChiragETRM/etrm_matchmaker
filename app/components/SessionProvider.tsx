'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Handle session errors globally
    const handleStorageChange = (e: StorageEvent) => {
      // If session storage is cleared, reload to get fresh session
      if (e.key === null || e.key?.includes('next-auth')) {
        // Don't reload immediately, let NextAuth handle it
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return (
    <NextAuthSessionProvider
      // Disable refetch on every tab switch to avoid excessive API calls
      refetchOnWindowFocus={false}
      // Refetch session every 30 minutes (sessions have 30-day TTL -- 5 min was excessive)
      refetchInterval={30 * 60}
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  )
}
