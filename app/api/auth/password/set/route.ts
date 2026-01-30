import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, validatePassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { password, name: nameFromBody } = body as { password?: string; name?: string }

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

    const passwordHash = await hashPassword(password)
    const nameTrim = typeof nameFromBody === 'string' ? nameFromBody.trim() || null : null

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash,
        ...(nameTrim !== null && { name: nameTrim }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[password/set]', err)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
