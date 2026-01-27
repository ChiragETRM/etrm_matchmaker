// Email sending abstraction
// Supports Postmark, SendGrid, or AWS SES

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
  const provider = process.env.EMAIL_PROVIDER || 'POSTMARK'

  if (provider === 'POSTMARK') {
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
    console.error('Postmark credentials not configured: missing', !apiKey ? 'POSTMARK_API_KEY' : 'POSTMARK_FROM_EMAIL')
    return {
      messageId: '',
      success: false,
      error: 'Postmark credentials not configured',
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