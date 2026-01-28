import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadFile } from '@/lib/storage'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

// File upload endpoint
// Requires either:
// 1. A valid application session token (for anonymous applicants)
// 2. An authenticated user session (for logged-in users)

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit(`file-upload:${ip}`, RATE_LIMITS.fileUpload)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'resumes'
    const sessionToken = formData.get('sessionToken') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileName = file.name.toLowerCase()
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
    const hasValidMimeType = ALLOWED_MIME_TYPES.includes(file.type)

    if (!hasValidExtension && !hasValidMimeType) {
      return NextResponse.json(
        { error: 'File type not allowed. Please upload a PDF or DOCX file.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Authorization: Check either session token or user auth
    let authorized = false
    let authContext: string | null = null

    // Option 1: Check application session token (for anonymous applicants)
    if (sessionToken) {
      const appSession = await prisma.applicationSession.findUnique({
        where: { sessionToken },
        select: { id: true, status: true },
      })

      if (appSession && appSession.status === 'PASSED') {
        authorized = true
        authContext = `session:${appSession.id}`
      }
    }

    // Option 2: Check user authentication (for logged-in users)
    if (!authorized) {
      const session = await auth()
      if (session?.user?.email) {
        authorized = true
        authContext = `user:${session.user.email}`
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in or provide a valid session token.' },
        { status: 401 }
      )
    }

    // Upload file
    const result = await uploadFile(file, folder)

    console.log('File uploaded:', {
      fileId: result.fileId,
      authContext,
      mimeType: file.type,
      size: file.size,
    })

    return NextResponse.json({
      fileId: result.fileId,
      path: result.path,
      url: result.url,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
