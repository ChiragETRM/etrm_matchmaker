import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { sendEmail } from '@/lib/email'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyTurnstileToken, isTurnstileEnabled } from '@/lib/turnstile'
import { escapeHtml, sanitizeName, sanitizePhone, sanitizeLinkedInUrl } from '@/lib/sanitize'
import { z } from 'zod'

const submitSchema = z.object({
  candidateName: z.string().min(1).max(200),
  candidateEmail: z.string().email().max(254),
  candidatePhone: z.string().max(30).optional(),
  candidateLinkedin: z.string().url().optional().or(z.literal('')),
  consent: z.boolean().refine((val) => val === true, {
    message: 'Consent is required',
  }),
  turnstileToken: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { session: string } }
) {
  try {
    // Rate limiting (async for Redis support)
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit(`submit:${ip}`, RATE_LIMITS.submit)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const formData = await request.formData()
    const resume = formData.get('resume') as File | null

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const allowedExtensions = ['.pdf', '.doc', '.docx']
    const fileName = resume.name.toLowerCase()
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))

    if (!allowedTypes.includes(resume.type) && !hasValidExtension) {
      return NextResponse.json(
        { error: 'Resume must be PDF or DOCX' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (resume.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Resume must be less than 5MB' },
        { status: 400 }
      )
    }

    // Parse and validate form data
    const rawData = {
      candidateName: formData.get('candidateName'),
      candidateEmail: formData.get('candidateEmail'),
      candidatePhone: formData.get('candidatePhone') || undefined,
      candidateLinkedin: formData.get('candidateLinkedin') || undefined,
      consent: formData.get('consent') === 'true',
      turnstileToken: formData.get('turnstileToken') || undefined,
    }

    const data = submitSchema.parse(rawData)

    // Verify Turnstile CAPTCHA if enabled
    if (isTurnstileEnabled()) {
      const turnstileResult = await verifyTurnstileToken(data.turnstileToken, ip)
      if (!turnstileResult.success) {
        return NextResponse.json(
          { error: turnstileResult.error || 'CAPTCHA verification failed' },
          { status: 400 }
        )
      }
    }

    // Sanitize user inputs
    const sanitizedName = sanitizeName(data.candidateName)
    const sanitizedPhone = data.candidatePhone ? sanitizePhone(data.candidatePhone) : null
    const sanitizedLinkedin = data.candidateLinkedin ? sanitizeLinkedInUrl(data.candidateLinkedin) : null

    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Invalid name provided' },
        { status: 400 }
      )
    }

    // Get the application session
    const session = await prisma.applicationSession.findUnique({
      where: { sessionToken: params.session },
      include: {
        job: {
          include: {
            questionnaire: {
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'PASSED') {
      console.error(`Submit rejected: session ${params.session} has status '${session.status}', expected 'PASSED'`)
      return NextResponse.json(
        { error: `Application session is not eligible for submission (status: ${session.status})` },
        { status: 400 }
      )
    }

    // Check for existing application (duplicate prevention)
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_candidateEmail: {
          jobId: session.jobId,
          candidateEmail: data.candidateEmail.toLowerCase(),
        },
      },
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied for this position' },
        { status: 409 } // Conflict
      )
    }

    const answers = session.answersJson
      ? JSON.parse(session.answersJson)
      : {}

    // Upload resume
    const resumeArrayBuffer = await resume.arrayBuffer()
    const resumeBuffer = Buffer.from(resumeArrayBuffer)
    const resumeFileForUpload = new File([resumeBuffer], resume.name, { type: resume.type })

    let fileId: string | null = null
    try {
      const uploadResult = await uploadFile(resumeFileForUpload, 'resumes')
      fileId = uploadResult.fileId
    } catch (error) {
      console.error('File upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload resume' },
        { status: 500 }
      )
    }

    const resumeContentType =
      resume.type === 'application/pdf'
        ? 'application/pdf'
        : resume.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/msword'

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId: session.jobId,
        candidateName: sanitizedName,
        candidateEmail: data.candidateEmail.toLowerCase(),
        candidatePhone: sanitizedPhone,
        candidateLinkedin: sanitizedLinkedin,
        resumeFileId: fileId,
        answersJson: JSON.stringify(answers),
      },
    })

    // Update session to link to application
    await prisma.applicationSession.update({
      where: { id: session.id },
      data: {
        applicationId: application.id,
      },
    })

    // Send email to recruiter (non-blocking)
    let emailResult: { success: boolean; messageId: string; error?: string } = {
      success: false,
      messageId: '',
      error: 'Email not attempted',
    }

    try {
      const subjectPrefix = session.job.emailSubjectPrefix || 'Qualified Candidate'
      const subject = `${subjectPrefix} | ${escapeHtml(session.job.title)} | ${escapeHtml(sanitizedName)} | ${escapeHtml(session.job.locationText)}`

      const questions = session.job.questionnaire?.questions ?? []
      const answersHtml = questions
        .map((q) => {
          const answer = answers[q.key]
          let displayValue = answer
          if (Array.isArray(answer)) {
            displayValue = answer.map(a => escapeHtml(String(a))).join(', ')
          } else if (typeof answer === 'boolean') {
            displayValue = answer ? 'Yes' : 'No'
          } else {
            displayValue = escapeHtml(String(displayValue || 'N/A'))
          }
          return `<tr><td><strong>${escapeHtml(q.label)}</strong></td><td>${displayValue}</td></tr>`
        })
        .join('')

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const resumeUrl = fileId ? `${baseUrl}/api/files/${fileId}/download` : 'N/A'
      const jobLink = `${baseUrl}/jobs/${session.job.slug}`

      // Build email with escaped values
      const emailHtml = `
        <h2>New Qualified Candidate Application</h2>

        <h3>Job</h3>
        <ul>
          <li><strong>Role:</strong> ${escapeHtml(session.job.title)}</li>
          <li><strong>Location:</strong> ${escapeHtml(session.job.locationText)}</li>
          <li><strong>ETRM Packages:</strong> ${session.job.etrmPackages.map(p => escapeHtml(p)).join(', ') || 'N/A'}</li>
          <li><strong>Link to job:</strong> <a href="${escapeHtml(jobLink)}">${escapeHtml(jobLink)}</a></li>
        </ul>

        <h3>Candidate</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(sanitizedName)}</li>
          <li><strong>Email:</strong> ${escapeHtml(data.candidateEmail)}</li>
          <li><strong>Phone:</strong> ${escapeHtml(sanitizedPhone || 'N/A')}</li>
          <li><strong>LinkedIn:</strong> ${sanitizedLinkedin ? `<a href="${escapeHtml(sanitizedLinkedin)}">${escapeHtml(sanitizedLinkedin)}</a>` : 'N/A'}</li>
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

      console.log('Attempting to send email to recruiter:', {
        to: session.job.recruiterEmailTo,
        cc: session.job.recruiterEmailCc,
        subject,
        hasAttachment: !!resume.name,
        attachmentSize: resumeBuffer.length,
      })

      if (!session.job.recruiterEmailTo || !session.job.recruiterEmailTo.includes('@')) {
        throw new Error(`Invalid recruiter email address: ${session.job.recruiterEmailTo}`)
      }

      const emailResponse = await sendEmail({
        to: session.job.recruiterEmailTo,
        cc: session.job.recruiterEmailCc && session.job.recruiterEmailCc.length > 0
          ? session.job.recruiterEmailCc
          : undefined,
        subject,
        html: emailHtml,
        attachments: [
          {
            filename: resume.name || 'resume.pdf',
            content: resumeBuffer,
            contentType: resumeContentType,
          },
        ],
      })

      console.log('Email send response:', {
        success: emailResponse.success,
        messageId: emailResponse.messageId,
        error: emailResponse.error,
      })

      emailResult = {
        success: emailResponse.success,
        messageId: emailResponse.messageId,
        error: emailResponse.error,
      }

      if (!emailResult.success) {
        console.error('CRITICAL: Email to recruiter failed!', {
          to: session.job.recruiterEmailTo,
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

    // Log email result
    try {
      await prisma.mailLog.create({
        data: {
          jobId: session.jobId,
          applicationId: application.id,
          toEmail: session.job.recruiterEmailTo,
          ccEmails: session.job.recruiterEmailCc,
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
    console.error('Error submitting application:', error)

    // Handle duplicate application error from database constraint
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'You have already applied for this position' },
        { status: 409 }
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
