import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ applied: false })
    }

    const job = await prisma.job.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const existing = await prisma.application.findFirst({
      where: {
        jobId: job.id,
        candidateEmail: session.user.email,
      },
    })

    return NextResponse.json({ applied: !!existing })
  } catch (error) {
    console.error('Error checking applied status:', error)
    return NextResponse.json(
      { error: 'Failed to check applied status' },
      { status: 500 }
    )
  }
}
