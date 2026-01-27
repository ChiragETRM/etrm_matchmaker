import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const bodySchema = z.object({
  answers: z.record(z.any()),
})

export const dynamic = 'force-dynamic'

/**
 * POST
 * Saves/updates candidate gate answers (Skills / Experience)
 * Used to prepopulate forms for 1-click apply
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const email = session.user.email
    const body = await request.json()
    const data = bodySchema.parse(body)

    // Upsert each answer
    for (const [questionKey, answer] of Object.entries(data.answers)) {
      await prisma.candidateGateAnswer.upsert({
        where: {
          candidateEmail_questionKey: {
            candidateEmail: email,
            questionKey: questionKey,
          },
        },
        update: {
          answerJson: JSON.stringify(answer),
        },
        create: {
          candidateEmail: email,
          questionKey: questionKey,
          answerJson: JSON.stringify(answer),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error saving gate answers:', error)
    return NextResponse.json(
      { error: 'Failed to save answers' },
      { status: 500 }
    )
  }
}
