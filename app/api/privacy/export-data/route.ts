import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * GDPR Art. 20 — Right to data portability
 *
 * Returns all personal data associated with the authenticated user's email
 * in a structured, machine-readable JSON format.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = session.user.email.toLowerCase()

    // 1. User profile
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        givenName: true,
        familyName: true,
        locale: true,
        jobAlertPolicyAgreed: true,
        jobAlertPolicyAgreedAt: true,
        createdAt: true,
        updatedAt: true,
        // Exclude: image (external Google URL), googleSub, profileData (raw)
      },
    })

    // 2. Applications
    const applications = await prisma.application.findMany({
      where: { candidateEmail: email },
      select: {
        id: true,
        candidateName: true,
        candidateEmail: true,
        candidatePhone: true,
        candidateLinkedin: true,
        answersJson: true,
        recruiterStatus: true,
        createdAt: true,
        job: {
          select: {
            title: true,
            companyName: true,
            locationText: true,
            roleCategory: true,
          },
        },
      },
    })

    // Parse answersJson for readability
    const formattedApplications = applications.map((app) => ({
      ...app,
      answers: app.answersJson ? JSON.parse(app.answersJson) : {},
      answersJson: undefined,
    }))

    // 3. Candidate gate answers (saved screening responses)
    const gateAnswers = await prisma.candidateGateAnswer.findMany({
      where: { candidateEmail: email },
      select: {
        questionKey: true,
        answerJson: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const formattedGateAnswers = gateAnswers.map((ga) => ({
      ...ga,
      answer: JSON.parse(ga.answerJson),
      answerJson: undefined,
    }))

    // 4. Job alert subscription
    const subscription = await prisma.jobAlertSubscription.findUnique({
      where: { email },
      select: {
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const exportData = {
      exportedAt: new Date().toISOString(),
      dataSubject: email,
      profile: user || null,
      applications: formattedApplications,
      savedScreeningAnswers: formattedGateAnswers,
      jobAlertSubscription: subscription || null,
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="learnetrm-data-export-${Date.now()}.json"`,
        'Cache-Control': 'private, no-cache, no-store',
      },
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json(
      { error: 'Failed to export data. Please contact privacy@learnetrm.com.' },
      { status: 500 }
    )
  }
}
