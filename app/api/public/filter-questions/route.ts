import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Returns a unique set of all questions that appear in gate rules across active jobs.
 * Used by "Filter Jobs For Me" to build a single questionnaire.
 */
export async function GET() {
  try {
    const now = new Date()

    const jobs = await prisma.job.findMany({
      where: {
        expiresAt: { gt: now },
        status: 'ACTIVE',
        archived: false,
      },
      include: {
        questionnaire: {
          include: {
            questions: { orderBy: { orderIndex: 'asc' } },
            gateRules: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    })

    const keyToQuestion = new Map<
      string,
      { key: string; label: string; type: string; options: string[] | null; orderIndex: number }
    >()

    for (const job of jobs) {
      const q = job.questionnaire
      if (!q) continue
      const questions = q.questions
      const gateKeys = new Set(q.gateRules.map((r) => r.questionKey))
      for (const qu of questions) {
        if (!gateKeys.has(qu.key)) continue
        if (keyToQuestion.has(qu.key)) continue
        keyToQuestion.set(qu.key, {
          key: qu.key,
          label: qu.label,
          type: qu.type,
          options: qu.optionsJson ? JSON.parse(qu.optionsJson) : null,
          orderIndex: qu.orderIndex,
        })
      }
    }

    const questions = Array.from(keyToQuestion.values()).sort(
      (a, b) => a.orderIndex - b.orderIndex
    )

    const response = NextResponse.json({ questions })

    // Filter questions change infrequently -- cache for 5 minutes
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    )

    return response
  } catch (error) {
    console.error('Error fetching filter questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filter questions' },
      { status: 500 }
    )
  }
}
