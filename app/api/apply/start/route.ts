import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        questionnaire: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const now = new Date()
    if (job.expiresAt <= now || job.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Job has expired' }, { status: 410 })
    }

    const sessionToken = randomBytes(32).toString('hex')
    const hasQuestions = job.questionnaire?.questions && job.questionnaire.questions.length > 0

    const session = await prisma.applicationSession.create({
      data: {
        jobId: job.id,
        questionnaireVersion: job.questionnaire ? job.questionnaire.version : 0,
        sessionToken,
        status: hasQuestions ? 'IN_PROGRESS' : 'PASSED',
        ...(!hasQuestions ? { completedAt: now } : {}),
      },
    })

    const questions = hasQuestions
      ? job.questionnaire!.questions.map((q) => ({
          id: q.id,
          key: q.key,
          label: q.label,
          type: q.type,
          required: q.required,
          options: q.optionsJson ? JSON.parse(q.optionsJson) : null,
          orderIndex: q.orderIndex,
        }))
      : []

    return NextResponse.json({
      sessionToken: session.sessionToken,
      questions,
    })
  } catch (error) {
    console.error('Error starting application:', error)
    return NextResponse.json(
      { error: 'Failed to start application' },
      { status: 500 }
    )
  }
}