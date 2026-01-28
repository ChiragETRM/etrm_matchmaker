import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Default pagination settings
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50
const DEFAULT_APPLICATIONS_PER_JOB = 10

/**
 * GET
 * Returns jobs posted by the authenticated user (recruiterEmailTo) with applications.
 * Supports pagination for both jobs and applications within each job.
 *
 * Query params:
 *   page - Page number for jobs (default: 1)
 *   limit - Jobs per page (default: 10, max: 50)
 *   applicationsLimit - Applications per job (default: 10)
 *   includeArchived - Include archived jobs (default: false)
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
    const searchParams = request.nextUrl.searchParams

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
    )
    const applicationsLimit = Math.max(
      1,
      parseInt(searchParams.get('applicationsLimit') || String(DEFAULT_APPLICATIONS_PER_JOB), 10)
    )
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {
      recruiterEmailTo: email,
    }

    if (!includeArchived) {
      where.archived = false
    }

    // Get total count for pagination
    const totalCount = await prisma.job.count({ where })

    // Get paginated jobs with application counts first (lightweight query)
    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        companyName: true,
        locationText: true,
        roleCategory: true,
        remotePolicy: true,
        contractType: true,
        seniority: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        archived: true,
        _count: {
          select: {
            applications: true,
          },
        },
        questionnaire: {
          select: {
            id: true,
            questions: {
              orderBy: { orderIndex: 'asc' },
              select: {
                key: true,
                label: true,
                type: true,
              },
            },
          },
        },
        // Get limited applications (most recent first)
        applications: {
          orderBy: { createdAt: 'desc' },
          take: applicationsLimit,
          select: {
            id: true,
            candidateName: true,
            candidateEmail: true,
            candidatePhone: true,
            candidateLinkedin: true,
            answersJson: true,
            recruiterStatus: true,
            createdAt: true,
            resumeFileId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Transform the response
    const list = jobs.map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      companyName: j.companyName,
      locationText: j.locationText,
      roleCategory: j.roleCategory,
      remotePolicy: j.remotePolicy,
      contractType: j.contractType,
      seniority: j.seniority,
      status: j.status,
      link: `${baseUrl}/jobs/${j.slug}`,
      createdAt: j.createdAt,
      expiresAt: j.expiresAt,
      archived: j.archived,
      // Application summary
      applicationCount: j._count.applications,
      applicationsShown: j.applications.length,
      hasMoreApplications: j._count.applications > j.applications.length,
      // Questions for reference
      questions: j.questionnaire?.questions ?? [],
      // Applications with resume URLs
      applications: j.applications.map((a) => ({
        id: a.id,
        candidateName: a.candidateName,
        candidateEmail: a.candidateEmail,
        candidatePhone: a.candidatePhone,
        candidateLinkedin: a.candidateLinkedin,
        answersJson: a.answersJson,
        recruiterStatus: a.recruiterStatus,
        createdAt: a.createdAt,
        resumeUrl: a.resumeFileId
          ? `${baseUrl}/api/files/${a.resumeFileId}/download`
          : null,
      })),
    }))

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      jobs: list,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    })
  } catch (error) {
    console.error('Error fetching recruiter dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
