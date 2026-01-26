import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET ?email=...
 * Returns jobs posted by this recruiter (recruiterEmailTo) with applications.
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')?.trim()
    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    const jobs = await prisma.job.findMany({
      where: { recruiterEmailTo: email },
      include: {
        questionnaire: {
          include: {
            questions: { orderBy: { orderIndex: 'asc' } },
          },
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: { resumeFile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const list = jobs.map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      companyName: j.companyName,
      locationText: j.locationText,
      roleCategory: j.roleCategory,
      link: `${baseUrl}/jobs/${j.slug}`,
      createdAt: j.createdAt,
      applications: j.applications.map((a) => ({
        id: a.id,
        candidateName: a.candidateName,
        candidateEmail: a.candidateEmail,
        candidatePhone: a.candidatePhone,
        answersJson: a.answersJson,
        recruiterStatus: a.recruiterStatus,
        createdAt: a.createdAt,
        resumeUrl: a.resumeFileId
          ? `${baseUrl}/api/files/${a.resumeFileId}`
          : null,
        questions: j.questionnaire?.questions ?? [],
      })),
    }))

    return NextResponse.json({ jobs: list })
  } catch (error) {
    console.error('Error fetching recruiter dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
