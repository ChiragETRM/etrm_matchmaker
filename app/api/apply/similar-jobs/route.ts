import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { evaluateGates } from '@/lib/gate-evaluator'

export const dynamic = 'force-dynamic'

/**
 * GET /api/apply/similar-jobs?jobId=xxx&limit=3
 * Or GET /api/apply/similar-jobs?session=xxx&limit=3
 * Returns up to `limit` jobs the candidate is eligible for (by gate answers),
 * excluding the applied job and already-applied jobs. Requires auth.
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

    const { searchParams } = new URL(request.url)
    let jobId = searchParams.get('jobId')
    const sessionToken = searchParams.get('session')
    const limit = Math.min(parseInt(searchParams.get('limit') || '3', 10) || 3, 10)

    if (sessionToken && !jobId) {
      const appSession = await prisma.applicationSession.findUnique({
        where: { sessionToken },
        select: { jobId: true },
      })
      if (appSession) jobId = appSession.jobId
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId or session is required' },
        { status: 400 }
      )
    }

    const email = session.user.email

    // Get candidate's saved gate answers
    const savedAnswers = await prisma.candidateGateAnswer.findMany({
      where: { candidateEmail: email },
    })
    const answers: Record<string, unknown> = {}
    savedAnswers.forEach((sa) => {
      answers[sa.questionKey] = JSON.parse(sa.answerJson)
    })

    const now = new Date()
    const jobs = await prisma.job.findMany({
      where: {
        id: { not: jobId },
        expiresAt: { gt: now },
        status: 'ACTIVE',
        archived: false,
      },
      include: {
        questionnaire: {
          include: {
            gateRules: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const passed: typeof jobs = []
    for (const job of jobs) {
      const rules = job.questionnaire?.gateRules ?? []
      if (rules.length === 0) {
        passed.push(job)
        continue
      }
      const evaluation = evaluateGates(
        rules.map((r) => ({
          questionKey: r.questionKey,
          operator: r.operator as 'EQ' | 'GTE' | 'INCLUDES_ANY' | 'INCLUDES_ALL' | 'IN',
          valueJson: r.valueJson,
        })),
        answers
      )
      if (evaluation.passed) passed.push(job)
    }

    const appliedJobIds = new Set(
      (
        await prisma.application.findMany({
          where: {
            candidateEmail: email,
            jobId: { in: passed.map((j) => j.id) },
          },
          select: { jobId: true },
        })
      ).map((a) => a.jobId)
    )

    const similar = passed
      .filter((j) => !appliedJobIds.has(j.id))
      .slice(0, limit)
      .map((j) => ({
        id: j.id,
        slug: j.slug,
        title: j.title,
        companyName: j.companyName,
        locationText: j.locationText,
        remotePolicy: j.remotePolicy,
        contractType: j.contractType,
        seniority: j.seniority,
        roleCategory: j.roleCategory,
      }))

    return NextResponse.json({ jobs: similar })
  } catch (error) {
    console.error('Error in similar-jobs:', error)
    return NextResponse.json(
      { error: 'Failed to load similar jobs' },
      { status: 500 }
    )
  }
}
