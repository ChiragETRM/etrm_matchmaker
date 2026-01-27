import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { session: string } }
) {
  try {
    const session = await prisma.applicationSession.findUnique({
      where: { sessionToken: params.session },
      select: { status: true },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ status: session.status })
  } catch (error) {
    console.error('Error checking session status:', error)
    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500 }
    )
  }
}
