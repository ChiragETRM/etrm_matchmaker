import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET
 * Returns applications for the authenticated user's email.
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

    // Fetch saved gate answers
    const gateAnswers = await prisma.candidateGateAnswer.findMany({
      where: { candidateEmail: email },
      orderBy: { questionKey: 'asc' },
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

    const gateAnswersList = gateAnswers.map((ga) => ({
      questionKey: ga.questionKey,
      answer: JSON.parse(ga.answerJson),
      updatedAt: ga.updatedAt,
    }))

    return NextResponse.json({ 
      applications: list,
      gateAnswers: gateAnswersList,
    })
  } catch (error) {
    console.error('Error fetching candidate dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
