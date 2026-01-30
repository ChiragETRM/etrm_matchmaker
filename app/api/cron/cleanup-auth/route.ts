import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Cleanup expired OTP, verification tokens, and password reset tokens
// Can be called by Vercel Cron, GitHub Actions, etc.

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const [otpDeleted, otpTokenDeleted, resetTokenDeleted] = await Promise.all([
      prisma.emailOtp.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.otpVerificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    ])

    return NextResponse.json({
      success: true,
      deleted: {
        emailOtps: otpDeleted.count,
        otpVerificationTokens: otpTokenDeleted.count,
        passwordResetTokens: resetTokenDeleted.count,
      },
    })
  } catch (error) {
    console.error('Error cleaning auth tokens:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
