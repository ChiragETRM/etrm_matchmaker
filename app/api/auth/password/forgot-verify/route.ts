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
    const { email, otp } = body as { email?: string; otp?: string }

    const emailStr = typeof email === 'string' ? email.trim().toLowerCase() : ''
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

    if (!otpRecord || otpRecord.expiresAt < new Date() || otpRecord.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
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

    await prisma.emailOtp.delete({ where: { id: otpRecord.id } })

    const user = await prisma.user.findUnique({
      where: { email: emailStr },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    const token = randomBytes(32).toString('hex')
    const tokenExpiry = new Date()
    tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 15)

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: tokenExpiry,
      },
    })

    return NextResponse.json({ success: true, resetToken: token })
  } catch (err) {
    console.error('[forgot-verify]', err)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
