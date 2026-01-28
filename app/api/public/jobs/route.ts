import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  getClientIp,
  getVercelCountry,
  countryCodeToName,
  geoFromIp,
} from '@/lib/geo'

export const dynamic = 'force-dynamic'

// Default pagination settings
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
    )
    const skip = (page - 1) * limit

    // Filter parameters
    const remotePolicy = searchParams.get('remotePolicy')
    const contractType = searchParams.get('contractType')
    const seniority = searchParams.get('seniority')
    const roleCategory = searchParams.get('roleCategory')
    const etrmPackage = searchParams.get('etrmPackage')
    const commodity = searchParams.get('commodity')
    const nearMe = searchParams.get('nearMe') === '1'

    const now = new Date()

    // Build where clause
    const where: Record<string, unknown> = {
      expiresAt: { gt: now },
      status: 'ACTIVE',
      archived: false,
    }

    if (remotePolicy) {
      where.remotePolicy = remotePolicy
    }
    if (contractType) {
      where.contractType = contractType
    }
    if (seniority) {
      where.seniority = seniority
    }
    if (roleCategory) {
      where.roleCategory = roleCategory
    }
    if (etrmPackage) {
      where.etrmPackages = { has: etrmPackage }
    }
    if (commodity) {
      where.commodityTags = { has: commodity }
    }

    // Get user country for "near me" filtering
    let userCountryCode: string | null = null
    let userCountryName: string | null = null

    if (nearMe) {
      userCountryCode = getVercelCountry(request)
      if (!userCountryCode) {
        const ip = getClientIp(request)
        if (ip) {
          const geo = await geoFromIp(ip)
          if (geo) {
            userCountryCode = geo.countryCode
            userCountryName = geo.country
          }
        }
      } else {
        userCountryName = countryCodeToName(userCountryCode)
      }

      // Add country filter to where clause if we have a country
      if (userCountryCode) {
        where.countryCode = userCountryCode
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.job.count({ where })

    // Get paginated jobs
    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        companyName: true,
        locationText: true,
        countryCode: true,
        remotePolicy: true,
        contractType: true,
        seniority: true,
        roleCategory: true,
        etrmPackages: true,
        commodityTags: true,
        experienceYearsMin: true,
        budgetMin: true,
        budgetMax: true,
        budgetCurrency: true,
        budgetPeriod: true,
        budgetIsEstimate: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    })

    // Additional client-side filtering for "near me" if no country code in DB
    let filtered = jobs
    if (nearMe && (userCountryCode || userCountryName) && !where.countryCode) {
      const code = (userCountryCode ?? '').toUpperCase()
      const name = (userCountryName ?? '').toLowerCase()
      const codeAliases = code === 'GB' ? ['gb', 'uk'] : code ? [code.toLowerCase()] : []
      filtered = jobs.filter((j) => {
        const jCode = (j.countryCode ?? '').toUpperCase()
        const jLoc = (j.locationText ?? '').toLowerCase()
        const codeMatch =
          code && (jCode === code || codeAliases.some((a) => jLoc.includes(a)))
        const nameMatch = name && jLoc.includes(name)
        return codeMatch || nameMatch
      })
    }

    // Check if user has applied to any jobs
    let appliedJobIds: Set<string> = new Set()
    try {
      const session = await auth()
      if (session?.user?.email) {
        const applications = await prisma.application.findMany({
          where: {
            candidateEmail: session.user.email,
            jobId: { in: filtered.map((j) => j.id) },
          },
          select: {
            jobId: true,
          },
        })
        appliedJobIds = new Set(applications.map((a) => a.jobId))
      }
    } catch (error) {
      // If auth fails, just continue without application status
      console.error('Error checking applications:', error)
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    // Build response
    const responseData = {
      jobs: filtered.map((job) => ({
        ...job,
        hasApplied: appliedJobIds.has(job.id),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      ...(nearMe && (userCountryCode || userCountryName)
        ? { detectedCountry: userCountryName ?? userCountryCode }
        : {}),
    }

    // Create response with caching headers
    const response = NextResponse.json(responseData)

    // Cache public job listings for 60 seconds
    // stale-while-revalidate allows serving stale content while revalidating in background
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    )

    return response
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
