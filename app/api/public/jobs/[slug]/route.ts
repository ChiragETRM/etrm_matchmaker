import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const now = new Date()
    const slugParam = params.slug?.trim() ?? ''

    // Case-insensitive slug lookup so direct URLs with different casing don't 404
    const job = await prisma.job.findFirst({
      where: {
        slug: { equals: slugParam, mode: 'insensitive' },
      },
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

    // Check if user has applied to this job
    let hasApplied = false
    try {
      const session = await auth()
      if (session?.user?.email) {
        const application = await prisma.application.findFirst({
          where: {
            candidateEmail: session.user.email,
            jobId: job.id,
          },
        })
        hasApplied = !!application
      }
    } catch (error) {
      // If auth fails, just continue without application status
      console.error('Error checking application:', error)
    }

    // Return job without sensitive info
    const { recruiterEmailTo, recruiterEmailCc, ...publicJob } = job

    return NextResponse.json({ job: { ...publicJob, hasApplied } })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}