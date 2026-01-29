import type { Metadata } from 'next'
import './globals.css'
import Nav from './components/Nav'
import SessionProvider from './components/SessionProvider'
import CookieConsent from './components/CookieConsent'

export const metadata: Metadata = {
  title: 'Hand Picked ETRM/CTRM Jobs',
  description: 'ETRM-focused job posting and application system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          <Nav />
          <main>{children}</main>
          <footer className="border-t border-gray-200 bg-white mt-12">
            <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
              <p>&copy; {new Date().getFullYear()} LearnETRM. All rights reserved.</p>
              <nav className="flex gap-4">
                <a href="/privacy" className="hover:text-gray-700 underline">Privacy Policy</a>
                <a href="/cookies" className="hover:text-gray-700 underline">Cookie Policy</a>
              </nav>
            </div>
          </footer>
          <CookieConsent />
        </SessionProvider>
      </body>
    </html>
  )
}