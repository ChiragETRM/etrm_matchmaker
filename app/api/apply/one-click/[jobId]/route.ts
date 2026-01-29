import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { evaluateGates } from '@/lib/gate-evaluator'
import { sendEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { escapeHtml } from '@/lib/html-escape'
import { z } from 'zod'

const oneClickApplySchema = z.object({
  gateAnswers: z.record(z.any()).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to use 1-click apply.' },
        { status: 401 }
      )
    }

    const email = session.user.email
    const jobId = params.jobId

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimit = checkRateLimit(`one-click-apply:${email}:${ip}`)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Fetch job with questionnaire and gate rules
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        questionnaire: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
            gateRules: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const now = new Date()
    if (job.expiresAt <= now || job.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Job has expired' }, { status: 410 })
    }

    // Check if candidate already applied to this job - do this early to avoid unnecessary processing
    const existingApplication = await prisma.application.findFirst({
      where: {
        jobId: job.id,
        candidateEmail: email,
      },
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job.' },
        { status: 400 }
      )
    }

    // Get candidate data from their most recent application or profile
    const latestApplication = await prisma.application.findFirst({
      where: { candidateEmail: email },
      orderBy: { createdAt: 'desc' },
      include: {
        resumeFile: true,
      },
    })

    const candidateName = session.user.name || latestApplication?.candidateName || email.split('@')[0]
    const candidatePhone = latestApplication?.candidatePhone || null
    const candidateLinkedin = latestApplication?.candidateLinkedin || null
    const resumeFileId = latestApplication?.resumeFileId || null

    if (!resumeFileId) {
      return NextResponse.json(
        { error: 'No CV found. Please upload your CV in the candidate dashboard first.' },
        { status: 400 }
      )
    }

    // Parse request body once
    let providedAnswers: Record<string, any> | undefined
    try {
      const body = await request.json()
      const parsed = oneClickApplySchema.parse(body)
      providedAnswers = parsed.gateAnswers
    } catch {
      // No body or invalid body - that's okay, we'll check saved answers
      providedAnswers = undefined
    }

    // Check if job has gate rules
    const hasGates = job.questionnaire && job.questionnaire.gateRules.length > 0

    if (hasGates) {
      const gateRules = job.questionnaire!.gateRules

      // Get saved gate answers for this candidate
      const savedAnswers = await prisma.candidateGateAnswer.findMany({
        where: { candidateEmail: email },
      })

      const savedAnswersMap: Record<string, any> = {}
      savedAnswers.forEach((sa) => {
        savedAnswersMap[sa.questionKey] = JSON.parse(sa.answerJson)
      })

      // Merge saved answers with provided answers (provided takes precedence)
      const allAnswers: Record<string, any> = { ...savedAnswersMap, ...(providedAnswers || {}) }

      // Check which gate questions need answers
      const requiredQuestionKeys = new Set(gateRules.map((r) => r.questionKey))
      const missingAnswers: string[] = []
      
      requiredQuestionKeys.forEach((key) => {
        if (allAnswers[key] === undefined || allAnswers[key] === null || allAnswers[key] === '') {
          missingAnswers.push(key)
        }
      })

      // If answers are provided, evaluate gates
      if (providedAnswers && Object.keys(providedAnswers).length > 0) {
        const evaluation = evaluateGates(
          gateRules.map((r) => ({
            questionKey: r.questionKey,
            operator: r.operator as any,
            valueJson: r.valueJson,
          })),
          allAnswers
        )

        if (!evaluation.passed) {
          return NextResponse.json(
            {
              error: 'You do not meet the minimum requirements for this position.',
              failedRules: evaluation.failedRules,
            },
            { status: 400 }
          )
        }

        // Save/update gate answers for future use
        for (const [key, value] of Object.entries(providedAnswers)) {
          await prisma.candidateGateAnswer.upsert({
            where: {
              candidateEmail_questionKey: {
                candidateEmail: email,
                questionKey: key,
              },
            },
            update: {
              answerJson: JSON.stringify(value),
            },
            create: {
              candidateEmail: email,
              questionKey: key,
              answerJson: JSON.stringify(value),
            },
          })
        }
      } else if (missingAnswers.length > 0) {
        // Need to collect answers for missing questions
        const questions = job.questionnaire!.questions.filter((q) =>
          missingAnswers.includes(q.key)
        )

        // Pre-fill with saved answers where available
        const prefillAnswers: Record<string, any> = {}
        questions.forEach((q) => {
          if (savedAnswersMap[q.key] !== undefined) {
            prefillAnswers[q.key] = savedAnswersMap[q.key]
          }
        })

        return NextResponse.json({
          requiresGateAnswers: true,
          questions: questions.map((q) => ({
            id: q.id,
            key: q.key,
            label: q.label,
            type: q.type,
            required: true, // Gate questions are always required
            options: q.optionsJson ? JSON.parse(q.optionsJson) : null,
            orderIndex: q.orderIndex,
          })),
          prefillAnswers,
        })
      } else {
        // All answers available, evaluate gates
        const evaluation = evaluateGates(
          gateRules.map((r) => ({
            questionKey: r.questionKey,
            operator: r.operator as any,
            valueJson: r.valueJson,
          })),
          allAnswers
        )

        if (!evaluation.passed) {
          return NextResponse.json(
            {
              error: 'You do not meet the minimum requirements for this position.',
              failedRules: evaluation.failedRules,
            },
            { status: 400 }
          )
        }
      }
    }

    // Get final answers (either from provided, saved, or empty if no gates)
    let finalAnswers: Record<string, any> = {}
    if (hasGates && job.questionnaire) {
      const savedAnswers = await prisma.candidateGateAnswer.findMany({
        where: { candidateEmail: email },
      })
      savedAnswers.forEach((sa) => {
        finalAnswers[sa.questionKey] = JSON.parse(sa.answerJson)
      })
      // Merge with provided answers if any
      if (providedAnswers) {
        finalAnswers = { ...finalAnswers, ...providedAnswers }
      }
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId: job.id,
        candidateName,
        candidateEmail: email,
        candidatePhone,
        candidateLinkedin,
        resumeFileId,
        answersJson: JSON.stringify(finalAnswers),
      },
    })

    // Send email to recruiter (non-blocking)
    let emailResult: { success: boolean; messageId: string; error?: string } = {
      success: false,
      messageId: '',
      error: 'Email not attempted',
    }

    try {
      const subjectPrefix = job.emailSubjectPrefix || 'Qualified Candidate'
      const subject = `${subjectPrefix} | ${job.title} | ${candidateName} | ${job.locationText}`

      const questions = job.questionnaire?.questions ?? []
      const answersHtml = questions
        .map((q) => {
          const answer = finalAnswers[q.key]
          let displayValue: string
          if (Array.isArray(answer)) {
            displayValue = escapeHtml(answer.join(', '))
          } else if (typeof answer === 'boolean') {
            displayValue = answer ? 'Yes' : 'No'
          } else {
            displayValue = escapeHtml(answer) || 'N/A'
          }
          return `<tr><td><strong>${escapeHtml(q.label)}</strong></td><td>${displayValue}</td></tr>`
        })
        .join('')

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const resumeUrl = resumeFileId ? `${baseUrl}/api/files/${resumeFileId}/download` : 'N/A'
      const jobLink = `${baseUrl}/jobs/${job.slug}`

      const emailHtml = `
        <h2>New Qualified Candidate Application (1-Click Apply)</h2>

        <h3>Job</h3>
        <ul>
          <li><strong>Role:</strong> ${escapeHtml(job.title)}</li>
          <li><strong>Location:</strong> ${escapeHtml(job.locationText)}</li>
          <li><strong>ETRM Packages:</strong> ${escapeHtml(job.etrmPackages.join(', ')) || 'N/A'}</li>
          <li><strong>Link to job:</strong> <a href="${escapeHtml(jobLink)}">${escapeHtml(jobLink)}</a></li>
        </ul>

        <h3>Candidate</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(candidateName)}</li>
          <li><strong>Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Phone:</strong> ${escapeHtml(candidatePhone) || 'N/A'}</li>
          <li><strong>LinkedIn:</strong> ${escapeHtml(candidateLinkedin) || 'N/A'}</li>
        </ul>

        <h3>Resume</h3>
        <p>CV attached to this email. <a href="${escapeHtml(resumeUrl)}">Or download here</a>.</p>
        ${answersHtml ? `
        <h3>Questions &amp; Answers</h3>
        <table border="1" cellpadding="5" cellspacing="0">
          ${answersHtml}
        </table>
        ` : ''}
      `

      if (!job.recruiterEmailTo || !job.recruiterEmailTo.includes('@')) {
        throw new Error(`Invalid recruiter email address: ${job.recruiterEmailTo}`)
      }

      // Note: For 1-click apply, we include a link to the resume instead of attaching it
      // The resume can be downloaded from the link in the email
      const emailResponse = await sendEmail({
        to: job.recruiterEmailTo,
        cc: job.recruiterEmailCc && job.recruiterEmailCc.length > 0 
          ? job.recruiterEmailCc 
          : undefined,
        subject,
        html: emailHtml,
        // Resume is available via the link in the email body
      })

      emailResult = {
        success: emailResponse.success,
        messageId: emailResponse.messageId,
        error: emailResponse.error,
      }

      if (!emailResult.success) {
        console.error('CRITICAL: Email to recruiter failed!', {
          to: job.recruiterEmailTo,
          error: emailResult.error,
          applicationId: application.id,
        })
      }
    } catch (emailError) {
      console.error('Email sending error (application was saved successfully):', emailError)
      emailResult = {
        success: false,
        messageId: '',
        error: emailError instanceof Error ? emailError.message : 'Unknown email error',
      }
    }

    // Log email
    try {
      await prisma.mailLog.create({
        data: {
          jobId: job.id,
          applicationId: application.id,
          toEmail: job.recruiterEmailTo,
          ccEmails: job.recruiterEmailCc,
          status: emailResult.success ? 'SENT' : 'FAILED',
          providerMessageId: emailResult.messageId || null,
          errorText: emailResult.error || null,
        },
      })
    } catch (logError) {
      console.error('Failed to create mail log:', logError)
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
    })
  } catch (error) {
    console.error('Error in one-click apply:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to process 1-click apply' },
      { status: 500 }
    )
  }
}
