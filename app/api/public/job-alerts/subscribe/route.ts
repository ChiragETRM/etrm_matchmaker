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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Upsert subscription (create or update if exists)
    const subscription = await prisma.jobAlertSubscription.upsert({
      where: { email: email.toLowerCase().trim() },
      update: { isActive: true, updatedAt: new Date() },
      create: {
        email: email.toLowerCase().trim(),
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to job alerts',
    })
  } catch (error) {
    console.error('Error subscribing to job alerts:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to job alerts' },
      { status: 500 }
    )
  }
}
