import { auth } from '@/lib/auth'

// Use NextAuth's built-in middleware with the authorized callback
export default auth

export const config = {
  // Match dashboard and post-job routes
  matcher: ['/dashboard', '/dashboard/:path*', '/post-job', '/post-job/:path*'],
}
