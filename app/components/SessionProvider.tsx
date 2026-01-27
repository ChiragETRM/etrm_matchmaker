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
      // Refetch session on window focus to catch session updates
      refetchOnWindowFocus={true}
      // Refetch session every 5 minutes to keep it fresh
      refetchInterval={5 * 60}
      // Refetch when mounting to ensure we have the latest session
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  )
}
