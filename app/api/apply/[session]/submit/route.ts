import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { sendEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const submitSchema = z.object({
  candidateName: z.string().min(1),
  candidateEmail: z.string().email(),
  candidatePhone: z.string().optional(),
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
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimit = checkRateLimit(`submit:${ip}`)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
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

    const data = submitSchema.parse({
      candidateName: formData.get('candidateName'),
      candidateEmail: formData.get('candidateEmail'),
      candidatePhone: formData.get('candidatePhone') || undefined,
      candidateLinkedin: formData.get('candidateLinkedin') || undefined,
      consent: formData.get('consent') === 'true',
      turnstileToken: formData.get('turnstileToken') || undefined,
    })

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

    const answers = session.answersJson
      ? JSON.parse(session.answersJson)
      : {}

    // Upload resume (metadata for dashboard) and prepare email attachment
    // Read file once - File objects can only be read once
    const resumeArrayBuffer = await resume.arrayBuffer()
    const resumeBuffer = Buffer.from(resumeArrayBuffer)
    
    // Create a new File object from the buffer for upload
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
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        candidatePhone: data.candidatePhone,
        candidateLinkedin: data.candidateLinkedin || null,
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

    // Send email to recruiter (non-blocking - submission succeeds even if email fails)
    let emailResult: { success: boolean; messageId: string; error?: string } = {
      success: false,
      messageId: '',
      error: 'Email not attempted',
    }

    try {
      const subjectPrefix = session.job.emailSubjectPrefix || 'Qualified Candidate'
      const subject = `${subjectPrefix} | ${session.job.title} | ${data.candidateName} | ${session.job.locationText}`

      const questions = session.job.questionnaire?.questions ?? []
      const answersHtml = questions
        .map((q) => {
          const answer = answers[q.key]
          let displayValue = answer
          if (Array.isArray(answer)) {
            displayValue = answer.join(', ')
          } else if (typeof answer === 'boolean') {
            displayValue = answer ? 'Yes' : 'No'
          }
          return `<tr><td><strong>${q.label}</strong></td><td>${displayValue || 'N/A'}</td></tr>`
        })
        .join('')

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const resumeUrl = fileId ? `${baseUrl}/api/files/${fileId}` : 'N/A'
      const jobLink = `${baseUrl}/jobs/${session.job.slug}`

      const emailHtml = `
        <h2>New Qualified Candidate Application</h2>

        <h3>Job</h3>
        <ul>
          <li><strong>Role:</strong> ${session.job.title}</li>
          <li><strong>Location:</strong> ${session.job.locationText}</li>
          <li><strong>ETRM Packages:</strong> ${session.job.etrmPackages.join(', ') || 'N/A'}</li>
          <li><strong>Link to job:</strong> <a href="${jobLink}">${jobLink}</a></li>
        </ul>

        <h3>Candidate</h3>
        <ul>
          <li><strong>Name:</strong> ${data.candidateName}</li>
          <li><strong>Email:</strong> ${data.candidateEmail}</li>
          <li><strong>Phone:</strong> ${data.candidatePhone || 'N/A'}</li>
          <li><strong>LinkedIn:</strong> ${data.candidateLinkedin || 'N/A'}</li>
        </ul>

        <h3>Resume</h3>
        <p>CV attached to this email. <a href="${resumeUrl}">Or download here</a>.</p>
        ${answersHtml ? `
        <h3>Questions &amp; Answers</h3>
        <table border="1" cellpadding="5" cellspacing="0">
          ${answersHtml}
        </table>
        ` : ''}
      `

      emailResult = await sendEmail({
        to: session.job.recruiterEmailTo,
        cc: session.job.recruiterEmailCc,
        subject,
        html: emailHtml,
        attachments: [
          {
            filename: resume.name || 'resume',
            content: resumeBuffer,
            contentType: resumeContentType,
          },
        ],
      })
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