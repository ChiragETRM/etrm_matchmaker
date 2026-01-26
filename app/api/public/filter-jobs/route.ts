import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluateGates } from '@/lib/gate-evaluator'

export const dynamic = 'force-dynamic'

/**
 * POST { answers: Record<string, unknown> }
 * Returns jobs whose gate rules the candidate passes.
 */
export async function POST(request: NextRequest) {
  try {
    const { answers: raw } = (await request.json()) as { answers?: Record<string, unknown> }

    if (!raw || typeof raw !== 'object') {
      return NextResponse.json(
        { error: 'answers is required' },
        { status: 400 }
      )
    }

    const answers: Record<string, unknown> = { ...raw }
    for (const k of Object.keys(answers)) {
      const v = answers[k]
      if (v === 'true') answers[k] = true
      else if (v === 'false') answers[k] = false
    }

    const now = new Date()

    const jobs = await prisma.job.findMany({
      where: {
        expiresAt: { gt: now },
        status: 'ACTIVE',
      },
      include: {
        questionnaire: {
          include: {
            gateRules: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const passed: typeof jobs = []

    for (const job of jobs) {
      const rules = job.questionnaire?.gateRules ?? []
      if (rules.length === 0) {
        passed.push(job)
        continue
      }
      const evaluation = evaluateGates(
        rules.map((r) => ({
          questionKey: r.questionKey,
          operator: r.operator as 'EQ' | 'GTE' | 'INCLUDES_ANY' | 'INCLUDES_ALL' | 'IN',
          valueJson: r.valueJson,
        })),
        answers as Record<string, unknown>
      )
      if (evaluation.passed) passed.push(job)
    }

    const publicJobs = passed.map((j) => {
      const { recruiterEmailTo, recruiterEmailCc, ...rest } = j
      return rest
    })

    return NextResponse.json({
      jobs: publicJobs.map((j) => ({
        id: j.id,
        slug: j.slug,
        title: j.title,
        companyName: j.companyName,
        locationText: j.locationText,
        remotePolicy: j.remotePolicy,
        contractType: j.contractType,
        seniority: j.seniority,
        roleCategory: j.roleCategory,
        etrmPackages: j.etrmPackages,
        commodityTags: j.commodityTags,
        experienceYearsMin: j.experienceYearsMin,
        budgetMin: j.budgetMin,
        budgetMax: j.budgetMax,
        budgetCurrency: j.budgetCurrency,
        budgetPeriod: j.budgetPeriod,
        budgetIsEstimate: j.budgetIsEstimate,
        createdAt: j.createdAt,
        expiresAt: j.expiresAt,
      })),
    })
  } catch (error) {
    console.error('Error filtering jobs:', error)
    return NextResponse.json(
      { error: 'Failed to filter jobs' },
      { status: 500 }
    )
  }
}
