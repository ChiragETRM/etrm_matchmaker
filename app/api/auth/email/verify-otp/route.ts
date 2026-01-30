import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOtpHash } from '@/lib/otp'
import { checkOtpVerifyLimit } from '@/lib/auth-rate-limit'
import { randomBytes } from 'crypto'

const OTP_REGEX = /^\d{6}$/
const MAX_ATTEMPTS = 5

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, otp, name: nameFromBody } = body as { email?: string; otp?: string; name?: string }

    const emailStr = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const nameFromRequest = typeof nameFromBody === 'string' ? nameFromBody.trim() || null : null
    const otpStr = typeof otp === 'string' ? otp.trim() : ''

    if (!emailStr || !otpStr) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    if (!OTP_REGEX.test(otpStr)) {
      return NextResponse.json(
        { error: 'Invalid OTP format' },
        { status: 400 }
      )
    }

    const ip = getClientIp(req)

    const limit = checkOtpVerifyLimit(ip)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const otpRecord = await prisma.emailOtp.findFirst({
      where: { email: emailStr },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    if (otpRecord.expiresAt < new Date()) {
      await prisma.emailOtp.delete({ where: { id: otpRecord.id } })
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new code.' },
        { status: 400 }
      )
    }

    const valid = await verifyOtpHash(otpStr, otpRecord.otpHash)
    if (!valid) {
      await prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      })
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    // OTP valid - delete it (one-time use)
    await prisma.emailOtp.delete({ where: { id: otpRecord.id } })

    let user = await prisma.user.findUnique({
      where: { email: emailStr },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: emailStr,
          name: nameFromRequest || emailStr.split('@')[0],
          emailVerified: new Date(),
        },
      })
    } else if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      })
      user = { ...user, emailVerified: new Date() }
    }

    if (nameFromRequest && !user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: nameFromRequest },
      })
      user = { ...user, name: nameFromRequest }
    }

    // Audit: last login time and IP
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    })

    const needsPasswordSetup = !user.passwordHash

    // Create one-time token for credentials sign-in (NextAuth will create session)
    const token = randomBytes(32).toString('hex')
    const tokenExpiry = new Date()
    tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 5)

    await prisma.otpVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: tokenExpiry,
      },
    })

    return NextResponse.json({
      success: true,
      needsPasswordSetup,
      signInToken: token,
    })
  } catch (err) {
    console.error('[verify-otp]', err)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
