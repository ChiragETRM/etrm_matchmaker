import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update user's job alert policy agreement
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        jobAlertPolicyAgreed: true,
        jobAlertPolicyAgreedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Job alert policy agreement saved',
    })
  } catch (error) {
    console.error('Error saving job alert policy agreement:', error)
    return NextResponse.json(
      { error: 'Failed to save job alert policy agreement' },
      { status: 500 }
    )
  }
}
