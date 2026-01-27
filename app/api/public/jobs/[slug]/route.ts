import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const now = new Date()

    const job = await prisma.job.findUnique({
      where: { slug: params.slug },
      include: {
        questionnaire: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
            gateRules: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.expiresAt <= now || job.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Job has expired' }, { status: 410 })
    }

    if (job.archived) {
      return NextResponse.json({ error: 'Job has been archived' }, { status: 410 })
    }

    // Return job without sensitive info
    const { recruiterEmailTo, recruiterEmailCc, ...publicJob } = job

    return NextResponse.json({ job: publicJob })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}