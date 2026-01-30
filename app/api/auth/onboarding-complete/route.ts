import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, validatePassword } from '@/lib/password'

/**
 * Complete onboarding with token from OTP verify (no session required).
 * Validates OtpVerificationToken, updates user name and password.
 * Client then uses the same token with NextAuth callback to create session.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, name: nameFromBody, password } = body as {
      token?: string
      name?: string
      password?: string
    }

    const tokenStr = typeof token === 'string' ? token.trim() : ''
    if (!tokenStr) {
      return NextResponse.json(
        { error: 'Invalid request. Please start from sign in.' },
        { status: 400 }
      )
    }

    if (typeof password !== 'string' || !password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const validation = validatePassword(password)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 }
      )
    }

    const record = await prisma.otpVerificationToken.findUnique({
      where: { token: tokenStr },
    })

    if (!record || record.expiresAt < new Date()) {
      if (record) await prisma.otpVerificationToken.delete({ where: { id: record.id } }).catch(() => {})
      return NextResponse.json(
        { error: 'This link has expired. Please sign in again.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
    })
    if (!user) {
      await prisma.otpVerificationToken.delete({ where: { id: record.id } }).catch(() => {})
      return NextResponse.json(
        { error: 'Invalid request. Please sign in again.' },
        { status: 400 }
      )
    }

    const nameTrim = typeof nameFromBody === 'string' ? nameFromBody.trim() || null : null
    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        ...(nameTrim !== null && { name: nameTrim }),
      },
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log('[onboarding-complete] user created/updated', user.id, 'token left for credentials callback')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[onboarding-complete]', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
