import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword, validatePassword } from '@/lib/password'

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60 // 30 days, match NextAuth session.maxAge
const isProduction = process.env.NODE_ENV === 'production'
const SESSION_COOKIE_NAME = `${isProduction ? '__Secure-' : ''}next-auth.session-token`

/**
 * Complete onboarding with token from OTP verify.
 * Validates OtpVerificationToken, updates user name and password, then creates
 * a session and sets the session cookie so the user is authenticated immediately.
 * Client redirects to redirectUrl; no form POST to credentials callback.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, name: nameFromBody, password, callbackUrl: callbackUrlFromBody } = body as {
      token?: string
      name?: string
      password?: string
      callbackUrl?: string
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

    const rawRedirect = typeof callbackUrlFromBody === 'string' ? callbackUrlFromBody.trim() : ''
    const redirectUrl = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard'

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

    // One-time token consumed: delete so it cannot be reused
    await prisma.otpVerificationToken.delete({ where: { id: record.id } }).catch(() => {})

    // Create session and set cookie (same as verify-otp for existing users).
    // This avoids the credentials callback form POST which was redirecting to signin.
    const sessionToken = randomUUID()
    const expires = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000)
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log('[onboarding-complete] session created', { userId: user.id, redirectUrl })
    }

    const res = NextResponse.json({ success: true, redirectUrl })
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isProduction,
      expires,
    })
    return res
  } catch (err) {
    console.error('[onboarding-complete]', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
