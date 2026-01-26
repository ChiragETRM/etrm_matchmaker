import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET ?email=...
 * Returns applications for this candidate email. No auth; email-based lookup only.
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

    const applications = await prisma.application.findMany({
      where: { candidateEmail: email },
      include: {
        job: {
          select: {
            id: true,
            slug: true,
            title: true,
            companyName: true,
            locationText: true,
            roleCategory: true,
          },
        },
        resumeFile: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const list = applications.map((a) => ({
      id: a.id,
      candidateName: a.candidateName,
      candidateEmail: a.candidateEmail,
      candidatePhone: a.candidatePhone,
      answersJson: a.answersJson,
      recruiterStatus: a.recruiterStatus,
      createdAt: a.createdAt,
      job: a.job
        ? {
            id: a.job.id,
            slug: a.job.slug,
            title: a.job.title,
            companyName: a.job.companyName,
            locationText: a.job.locationText,
            roleCategory: a.job.roleCategory,
            link: `${baseUrl}/jobs/${a.job.slug}`,
          }
        : null,
      resumeUrl: a.resumeFileId
        ? `${baseUrl}/api/files/${a.resumeFileId}`
        : null,
    }))

    return NextResponse.json({ applications: list })
  } catch (error) {
    console.error('Error fetching candidate dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
