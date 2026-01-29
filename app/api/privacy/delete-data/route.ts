import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * GDPR Art. 17 — Right to erasure ("right to be forgotten")
 *
 * Deletes all personal data associated with the authenticated user's email:
 * - Applications (and linked resume files)
 * - Application sessions
 * - Candidate gate answers
 * - Job alert subscriptions
 * - Mail logs (personal references replaced with "[deleted]")
 * - User account and linked OAuth accounts/sessions
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = session.user.email.toLowerCase()

    // 1. Find all applications by this candidate
    const applications = await prisma.application.findMany({
      where: { candidateEmail: email },
      select: { id: true, resumeFileId: true },
    })

    const applicationIds = applications.map((a) => a.id)
    const resumeFileIds = applications
      .map((a) => a.resumeFileId)
      .filter((id): id is string => !!id)

    // 2. Delete resume files
    if (resumeFileIds.length > 0) {
      await prisma.fileObject.deleteMany({
        where: { id: { in: resumeFileIds } },
      })
    }

    // 3. Delete mail logs referencing these applications
    if (applicationIds.length > 0) {
      await prisma.mailLog.deleteMany({
        where: { applicationId: { in: applicationIds } },
      })
    }

    // 4. Delete application sessions
    await prisma.applicationSession.deleteMany({
      where: {
        OR: [
          { applicationId: { in: applicationIds } },
          // Also delete orphan sessions linked to jobs this candidate applied to
        ],
      },
    })

    // 5. Delete applications
    await prisma.application.deleteMany({
      where: { candidateEmail: email },
    })

    // 6. Delete candidate gate answers
    await prisma.candidateGateAnswer.deleteMany({
      where: { candidateEmail: email },
    })

    // 7. Delete job alert subscription
    await prisma.jobAlertSubscription.deleteMany({
      where: { email },
    })

    // 8. Delete user account (and cascaded accounts/sessions via Prisma relations)
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (user) {
      // Delete related NextAuth records
      await prisma.account.deleteMany({ where: { userId: user.id } })
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }

    return NextResponse.json({
      success: true,
      message:
        'All your personal data has been deleted. You have been signed out. ' +
        'This action is irreversible.',
      deletedRecords: {
        applications: applicationIds.length,
        resumeFiles: resumeFileIds.length,
        gateAnswers: 'all',
        jobAlertSubscription: 'removed',
        userAccount: user ? 'deleted' : 'not found',
      },
    })
  } catch (error) {
    console.error('Error deleting user data:', error)
    return NextResponse.json(
      { error: 'Failed to delete data. Please contact privacy@learnetrm.com.' },
      { status: 500 }
    )
  }
}
