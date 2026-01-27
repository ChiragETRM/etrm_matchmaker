// Email sending abstraction
// Supports Postmark, SMTP (Gmail), SendGrid, or AWS SES

import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  cc?: string[]
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export async function sendEmail(options: EmailOptions): Promise<{
  messageId: string
  success: boolean
  error?: string
}> {
  const provider = process.env.EMAIL_PROVIDER || 'SMTP'

  // Auto-detect provider based on available credentials
  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
  const hasPostmark = process.env.POSTMARK_API_KEY && process.env.POSTMARK_FROM_EMAIL

  // Use SMTP if explicitly set or if SMTP credentials are available
  if (provider === 'SMTP' || (provider === 'POSTMARK' && !hasPostmark && hasSmtp)) {
    return sendViaSMTP(options)
  } else if (provider === 'POSTMARK' && hasPostmark) {
    return sendViaPostmark(options)
  } else if (provider === 'SENDGRID') {
    return sendViaSendGrid(options)
  } else {
    return sendViaSES(options)
  }
}

async function sendViaPostmark(
  options: EmailOptions
): Promise<{ messageId: string; success: boolean; error?: string }> {
  const apiKey = process.env.POSTMARK_API_KEY
  const fromEmail = process.env.POSTMARK_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    const missing = []
    if (!apiKey) missing.push('POSTMARK_API_KEY')
    if (!fromEmail) missing.push('POSTMARK_FROM_EMAIL')
    console.error('Postmark credentials not configured. Missing:', missing.join(', '))
    console.error('To fix this:')
    console.error('1. Sign up at https://postmarkapp.com (free tier available)')
    console.error('2. Get your Server API Token from Postmark dashboard')
    console.error('3. Add to your .env file:')
    console.error(`   POSTMARK_API_KEY="your-server-api-token"`)
    console.error(`   POSTMARK_FROM_EMAIL="noreply@yourdomain.com"`)
    console.error('4. For production (Vercel), add these to Environment Variables in Vercel dashboard')
    return {
      messageId: '',
      success: false,
      error: `Postmark credentials not configured. Missing: ${missing.join(', ')}. See server logs for setup instructions.`,
    }
  }

  try {
    const emailPayload: any = {
      From: fromEmail,
      To: options.to,
      Subject: options.subject,
      HtmlBody: options.html,
    }

    // Only include Cc if there are CC recipients
    if (options.cc && options.cc.length > 0) {
      emailPayload.Cc = options.cc.join(', ')
    }

    // Only include attachments if there are any
    if (options.attachments && options.attachments.length > 0) {
      emailPayload.Attachments = options.attachments.map((att) => ({
        Name: att.filename,
        Content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        ContentType: att.contentType || 'application/octet-stream',
      }))
    }

    console.log('Sending email via Postmark:', {
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      hasAttachments: !!(options.attachments && options.attachments.length > 0),
    })

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': apiKey,
      },
      body: JSON.stringify(emailPayload),
    })

    const data = await response.json()

    if (response.ok) {
      console.log('Email sent successfully via Postmark:', data.MessageID)
      return { messageId: data.MessageID, success: true }
    } else {
      console.error('Postmark API error:', {
        status: response.status,
        statusText: response.statusText,
        error: data,
      })
      return {
        messageId: '',
        success: false,
        error: data.Message || data.ErrorCode || `HTTP ${response.status}: ${response.statusText}`,
      }
    }
  } catch (error) {
    console.error('Postmark fetch error:', error)
    return {
      messageId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function sendViaSMTP(
  options: EmailOptions
): Promise<{ messageId: string; success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPassword = process.env.SMTP_PASSWORD
  const smtpFrom = process.env.SMTP_FROM || smtpUser

  if (!smtpHost || !smtpUser || !smtpPassword) {
    const missing = []
    if (!smtpHost) missing.push('SMTP_HOST')
    if (!smtpUser) missing.push('SMTP_USER')
    if (!smtpPassword) missing.push('SMTP_PASSWORD')
    console.error('SMTP credentials not configured. Missing:', missing.join(', '))
    return {
      messageId: '',
      success: false,
      error: `SMTP credentials not configured. Missing: ${missing.join(', ')}`,
    }
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    })

    // Prepare attachments
    const attachments = options.attachments?.map((att) => ({
      filename: att.filename,
      content: typeof att.content === 'string' ? Buffer.from(att.content, 'base64') : att.content,
      contentType: att.contentType,
    })) || []

    console.log('Sending email via SMTP:', {
      from: smtpFrom,
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      hasAttachments: attachments.length > 0,
    })

    // Send email
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: options.to,
      cc: options.cc && options.cc.length > 0 ? options.cc.join(', ') : undefined,
      subject: options.subject,
      html: options.html,
      attachments,
    })

    console.log('Email sent successfully via SMTP:', info.messageId)
    return {
      messageId: info.messageId || '',
      success: true,
    }
  } catch (error) {
    console.error('SMTP send error:', error)
    return {
      messageId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SMTP error',
    }
  }
}

async function sendViaSendGrid(
  options: EmailOptions
): Promise<{ messageId: string; success: boolean; error?: string }> {
  // TODO: Implement SendGrid
  throw new Error('SendGrid not implemented')
}

async function sendViaSES(
  options: EmailOptions
): Promise<{ messageId: string; success: boolean; error?: string }> {
  // TODO: Implement AWS SES
  throw new Error('AWS SES not implemented')
}