import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET
 * Returns jobs posted by the authenticated user (recruiterEmailTo) with applications.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const email = session.user.email

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const jobs = await prisma.job.findMany({
      where: { recruiterEmailTo: email },
      select: {
        id: true,
        slug: true,
        title: true,
        companyName: true,
        locationText: true,
        roleCategory: true,
        createdAt: true,
        archived: true,
        questionnaire: {
          select: {
            questions: {
              select: { id: true, key: true, label: true, type: true, optionsJson: true, orderIndex: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        applications: {
          select: {
            id: true,
            candidateName: true,
            candidateEmail: true,
            candidatePhone: true,
            answersJson: true,
            recruiterStatus: true,
            createdAt: true,
            resumeFileId: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const list = jobs.map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      companyName: j.companyName,
      locationText: j.locationText,
      roleCategory: j.roleCategory,
      link: `${baseUrl}/jobs/${j.slug}`,
      createdAt: j.createdAt,
      archived: j.archived,
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
