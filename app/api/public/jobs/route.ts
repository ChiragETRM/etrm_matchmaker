import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const now = new Date()

    const where: any = {
      expiresAt: { gt: now },
      status: 'ACTIVE',
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

    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        companyName: true,
        locationText: true,
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

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}