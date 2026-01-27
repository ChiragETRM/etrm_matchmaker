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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const remotePolicy = searchParams.get('remotePolicy')
    const contractType = searchParams.get('contractType')
    const seniority = searchParams.get('seniority')
    const roleCategory = searchParams.get('roleCategory')
    const etrmPackage = searchParams.get('etrmPackage')
    const commodity = searchParams.get('commodity')
    const nearMe = searchParams.get('nearMe') === '1'

    const now = new Date()

    const where: Record<string, unknown> = {
      expiresAt: { gt: now },
      status: 'ACTIVE',
      archived: false,
    }

    if (remotePolicy) {
      (where as any).remotePolicy = remotePolicy
    }
    if (contractType) {
      (where as any).contractType = contractType
    }
    if (seniority) {
      (where as any).seniority = seniority
    }
    if (roleCategory) {
      (where as any).roleCategory = roleCategory
    }
    if (etrmPackage) {
      (where as any).etrmPackages = { has: etrmPackage }
    }
    if (commodity) {
      (where as any).commodityTags = { has: commodity }
    }

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
    }

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
    })

    let filtered = jobs
    if (nearMe && (userCountryCode || userCountryName)) {
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

    const response = NextResponse.json({
      jobs: filtered.map((job) => ({
        ...job,
        hasApplied: appliedJobIds.has(job.id),
      })),
      ...(nearMe && (userCountryCode || userCountryName)
        ? { detectedCountry: userCountryName ?? userCountryCode }
        : {}),
    })

    // Cache job listings for 60s, serve stale while revalidating for up to 5 minutes
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