import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluateGates } from '@/lib/gate-evaluator'

export async function POST(
  request: NextRequest,
  { params }: { params: { session: string } }
) {
  try {
    const { answers } = await request.json()

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'answers is required' },
        { status: 400 }
      )
    }

    const session = await prisma.applicationSession.findUnique({
      where: { sessionToken: params.session },
      include: {
        job: {
          include: {
            questionnaire: {
              include: {
                gateRules: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // If session is already completed, return the existing result instead of error
    if (session.status !== 'IN_PROGRESS') {
      const existingAnswers = session.answersJson ? JSON.parse(session.answersJson) : {}
      const gateRules = session.job.questionnaire?.gateRules || []
      
      // Re-evaluate to get failed rules (in case they're needed)
      const evaluation = evaluateGates(
        gateRules.map((r) => ({
          questionKey: r.questionKey,
          operator: r.operator as any,
          valueJson: r.valueJson,
        })),
        existingAnswers
      )

      return NextResponse.json({
        passed: session.status === 'PASSED',
        status: session.status,
        failedRules: evaluation.failedRules,
      })
    }

    const now = new Date()
    if (session.job.expiresAt <= now || session.job.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Job has expired' }, { status: 410 })
    }

    const gateRules = session.job.questionnaire?.gateRules || []

    // Evaluate gates
    const evaluation = evaluateGates(
      gateRules.map((r) => ({
        questionKey: r.questionKey,
        operator: r.operator as any,
        valueJson: r.valueJson,
      })),
      answers
    )

    const status = evaluation.passed ? 'PASSED' : 'FAILED'

    await prisma.applicationSession.update({
      where: { id: session.id },
      data: {
        answersJson: JSON.stringify(answers),
        status,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      passed: evaluation.passed,
      status,
      failedRules: evaluation.failedRules,
    })
  } catch (error) {
    console.error('Error evaluating application:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate application' },
      { status: 500 }
    )
  }
}