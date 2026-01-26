import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const bodySchema = z.object({
  applicationId: z.string(),
  status: z.enum(['PENDING', 'SHORTLISTED', 'DISCARDED']),
})

export const dynamic = 'force-dynamic'

/**
 * PATCH { applicationId, status }
 * Updates recruiterStatus for an application. Verifies job.recruiterEmailTo matches authenticated user.
 */
export async function PATCH(request: NextRequest) {
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
    const { applicationId, status } = bodySchema.parse(body)

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    })

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (app.job.recruiterEmailTo.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only update applications for your own jobs' },
        { status: 403 }
      )
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { recruiterStatus: status },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating application status:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}
