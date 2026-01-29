import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const normalised = email.toLowerCase().trim()

    // Deactivate subscription (soft-delete to preserve audit trail)
    await prisma.jobAlertSubscription.updateMany({
      where: { email: normalised },
      data: { isActive: false, updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from job alerts.',
    })
  } catch (error) {
    console.error('Error unsubscribing from job alerts:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}

// Also support GET for one-click unsubscribe links in emails
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.redirect(new URL('/unsubscribe?error=missing-email', request.url))
  }

  const normalised = email.toLowerCase().trim()

  try {
    await prisma.jobAlertSubscription.updateMany({
      where: { email: normalised },
      data: { isActive: false, updatedAt: new Date() },
    })
  } catch (error) {
    console.error('Error unsubscribing:', error)
  }

  return NextResponse.redirect(new URL('/unsubscribe?success=true', request.url))
}
