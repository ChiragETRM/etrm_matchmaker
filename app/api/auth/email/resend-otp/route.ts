import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { generateOtp, hashOtp, getOtpExpiry } from '@/lib/otp'
import { checkOtpRequestLimit, checkResendLimit } from '@/lib/auth-rate-limit'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    const { email } = body as { email?: string }

    const emailStr = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!emailStr || !EMAIL_REGEX.test(emailStr)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const ip = getClientIp(req)

    const resendLimit = checkResendLimit(emailStr)
    if (!resendLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many resend requests. Please try again later.', retryAfterSeconds: resendLimit.retryAfterSeconds },
        { status: 429, headers: resendLimit.retryAfterSeconds ? { 'Retry-After': String(resendLimit.retryAfterSeconds) } : undefined }
      )
    }

    const requestLimit = checkOtpRequestLimit(ip, emailStr)
    if (!requestLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    const expiresAt = getOtpExpiry()

    await prisma.emailOtp.deleteMany({ where: { email: emailStr } })
    await prisma.emailOtp.create({
      data: {
        email: emailStr,
        otpHash,
        expiresAt,
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || null,
      },
    })

    const { success, error } = await sendEmail({
      to: emailStr,
      subject: 'Your LearnETRM login code',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e293b; margin-bottom: 16px;">Your login code</h2>
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.25em; color: #0f172a; margin: 24px 0; background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center;">${otp}</p>
          <p style="color: #64748b; font-size: 14px;">This code is valid for 10 minutes.</p>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    })

    if (!success) {
      console.error('[resend-otp] Failed to send email:', error)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[resend-otp]', err)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
