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
    const remotePolicy = searchParams.getAll('remotePolicy').filter(Boolean)
    const contractType = searchParams.getAll('contractType').filter(Boolean)
    const seniority = searchParams.getAll('seniority').filter(Boolean)
    const roleCategory = searchParams.getAll('roleCategory').filter(Boolean)
    const etrmPackage = searchParams.getAll('etrmPackage').filter(Boolean)
    const commodity = searchParams.getAll('commodity').filter(Boolean)
    const nearMe = searchParams.get('nearMe') === '1'

    const now = new Date()

    const where: Record<string, unknown> = {
      expiresAt: { gt: now },
      status: 'ACTIVE',
      archived: false,
    }

    if (remotePolicy.length > 0) {
      (where as any).remotePolicy = { in: remotePolicy }
    }
    if (contractType.length > 0) {
      (where as any).contractType = { in: contractType }
    }
    if (seniority.length > 0) {
      (where as any).seniority = { in: seniority }
    }
    if (roleCategory.length > 0) {
      (where as any).roleCategory = { in: roleCategory }
    }
    if (etrmPackage.length > 0) {
      (where as any).etrmPackages = { hasSome: etrmPackage }
    }
    if (commodity.length > 0) {
      (where as any).commodityTags = { hasSome: commodity }
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

    return NextResponse.json({
      jobs: filtered.map((job) => ({
        ...job,
        hasApplied: appliedJobIds.has(job.id),
      })),
      ...(nearMe && (userCountryCode || userCountryName)
        ? { detectedCountry: userCountryName ?? userCountryCode }
        : {}),
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}