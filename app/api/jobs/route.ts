import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/utils'
import { z } from 'zod'

const jobSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().optional(),
  locationText: z.string().min(1),
  countryCode: z.string().optional(),
  remotePolicy: z.enum(['ONSITE', 'HYBRID', 'REMOTE']),
  contractType: z.enum(['PERM', 'CONTRACT']),
  seniority: z.enum(['JUNIOR', 'MID', 'SENIOR']),
  roleCategory: z.string().min(1),
  etrmPackages: z.array(z.string()).default([]),
  commodityTags: z.array(z.string()).default([]),
  budget: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  budgetCurrency: z.string().optional(),
  budgetPeriod: z.enum(['DAILY', 'MONTHLY', 'YEARLY', 'ANNUAL', 'DAY_RATE']).optional(),
  budgetIsEstimate: z.boolean().default(false),
  visaSponsorshipProvided: z.boolean().optional(),
  jdText: z.string().min(1),
  recruiterEmailTo: z.string().email(),
  recruiterEmailCc: z.array(z.string().email()).default([]),
  emailSubjectPrefix: z.string().optional(),
  questions: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(['BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'NUMBER', 'COUNTRY']),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
      orderIndex: z.number().int(),
    })
  ).default([]),
  gateRules: z.array(
    z.object({
      questionKey: z.string(),
      operator: z.enum(['EQ', 'GTE', 'INCLUDES_ANY', 'INCLUDES_ALL', 'IN']),
      value: z.any(),
      orderIndex: z.number().int(),
    })
  ).default([]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = jobSchema.parse(body)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const slug = generateSlug(data.title)

    const hasQuestions = data.questions.length > 0

    const job = await prisma.job.create({
      data: {
        slug,
        title: data.title,
        companyName: data.companyName,
        locationText: data.locationText,
        countryCode: data.countryCode,
        remotePolicy: data.remotePolicy,
        contractType: data.contractType,
        seniority: data.seniority,
        roleCategory: data.roleCategory,
        etrmPackages: data.etrmPackages,
        commodityTags: data.commodityTags,
        budgetMin: data.budget ? parseFloat(data.budget) : data.budgetMin,
        budgetMax: data.budget ? parseFloat(data.budget) : data.budgetMax,
        budgetCurrency: data.budgetCurrency,
        budgetPeriod: data.budgetPeriod,
        budgetIsEstimate: data.budgetIsEstimate,
        visaSponsorshipProvided: data.visaSponsorshipProvided,
        jdText: data.jdText,
        recruiterEmailTo: data.recruiterEmailTo,
        recruiterEmailCc: data.recruiterEmailCc,
        emailSubjectPrefix: data.emailSubjectPrefix,
        expiresAt,
        ...(hasQuestions ? {
          questionnaire: {
            create: {
              version: 1,
              questions: {
                create: data.questions.map((q) => ({
                  key: q.key,
                  label: q.label,
                  type: q.type,
                  required: q.required,
                  optionsJson: q.options ? JSON.stringify(q.options) : null,
                  orderIndex: q.orderIndex,
                })),
              },
              gateRules: {
                create: data.gateRules.map((r) => {
                  // Ensure value is properly serialized
                  let value = r.value
                  if (typeof value === 'string') {
                    try {
                      value = JSON.parse(value)
                    } catch {
                      // If not JSON, keep as string
                    }
                  }
                  return {
                    questionKey: r.questionKey,
                    operator: r.operator,
                    valueJson: JSON.stringify(value),
                    orderIndex: r.orderIndex,
                  }
                }),
              },
            },
          },
        } : {}),
      },
      include: {
        questionnaire: true,
      },
    })

    const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/jobs/${job.slug}`

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        slug: job.slug,
        url: jobUrl,
        expiresAt: job.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    // Log full error details for debugging
    console.error('Error creating job:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to create job'
    let errorDetails = null
    
    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack
      
      // Check for database connection errors - include more Prisma error codes
      if (error.message.includes('Authentication failed') || 
          error.message.includes('credentials') ||
          error.message.includes("Can't reach database server") ||
          error.message.includes('P1001') ||
          error.message.includes('P1000') ||
          error.message.includes('P1017') ||
          error.message.includes('connection') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('timeout')) {
        errorMessage = 'Database connection failed. Please check your database credentials and connection string.'
        // Always include details for connection errors to help debug
        errorDetails = error.message
      } else if (error.message.includes('Unique constraint') || error.message.includes('P2002')) {
        errorMessage = 'A job with this title already exists. Please use a different title.'
      } else if (error.message.includes('Foreign key constraint') || error.message.includes('P2003')) {
        errorMessage = 'Invalid data reference. Please check your form inputs.'
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        // Include error details to help debug connection issues
        ...(errorDetails && { details: errorDetails })
      },
      { status: 500 }
    )
  }
}