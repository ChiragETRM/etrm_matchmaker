import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * PATCH
 * Archives or unarchives a job posted by the authenticated recruiter.
 * Body: { jobId: string, archived: boolean }
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
    const { jobId, archived } = await request.json()

    if (!jobId || typeof archived !== 'boolean') {
      return NextResponse.json(
        { error: 'jobId and archived (boolean) are required' },
        { status: 400 }
      )
    }

    // Verify the job belongs to this recruiter
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        recruiterEmailTo: email,
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update the archived status
    const updated = await prisma.job.update({
      where: { id: jobId },
      data: { archived },
    })

    return NextResponse.json({
      success: true,
      job: {
        id: updated.id,
        archived: updated.archived,
      },
    })
  } catch (error) {
    console.error('Error archiving/unarchiving job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}
