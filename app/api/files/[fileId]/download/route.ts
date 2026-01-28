import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { downloadFileFromStorage, verifyLocalDownloadToken } from '@/lib/storage'

// File download endpoint with authorization
// Access is granted if:
// 1. User is the candidate who submitted the resume
// 2. User is the recruiter for the job the resume was submitted to
// 3. A valid signed token is provided (for email links)

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId
    const searchParams = request.nextUrl.searchParams

    // Check for signed URL token (for LOCAL provider or email links)
    const token = searchParams.get('token')
    const expires = searchParams.get('expires')

    if (token && expires) {
      if (verifyLocalDownloadToken(fileId, token, expires)) {
        // Token is valid, proceed with download
        return serveFile(fileId)
      }
      return NextResponse.json(
        { error: 'Download link has expired or is invalid' },
        { status: 403 }
      )
    }

    // Get file metadata to check authorization
    const fileObject = await prisma.fileObject.findUnique({
      where: { id: fileId },
      include: {
        applications: {
          select: {
            candidateEmail: true,
            job: {
              select: {
                recruiterEmailTo: true,
                recruiterEmailCc: true,
              },
            },
          },
        },
      },
    })

    if (!fileObject) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get current user session
    const session = await auth()
    const userEmail = session?.user?.email?.toLowerCase()

    // Check if user is authorized to download this file
    let authorized = false
    let authReason = ''

    if (userEmail) {
      for (const application of fileObject.applications) {
        // Check if user is the candidate who submitted
        if (application.candidateEmail.toLowerCase() === userEmail) {
          authorized = true
          authReason = 'candidate'
          break
        }

        // Check if user is the primary recruiter
        if (application.job.recruiterEmailTo.toLowerCase() === userEmail) {
          authorized = true
          authReason = 'recruiter'
          break
        }

        // Check if user is in CC list
        const ccEmails = application.job.recruiterEmailCc.map(e => e.toLowerCase())
        if (ccEmails.includes(userEmail)) {
          authorized = true
          authReason = 'recruiter-cc'
          break
        }
      }
    }

    // If file has no applications (orphan), only allow in development
    if (fileObject.applications.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        authorized = true
        authReason = 'dev-orphan'
      }
    }

    if (!authorized) {
      // Log unauthorized access attempt
      console.warn('Unauthorized file download attempt:', {
        fileId,
        userEmail: userEmail || 'anonymous',
        applicationsCount: fileObject.applications.length,
      })

      return NextResponse.json(
        { error: 'You do not have permission to download this file' },
        { status: 403 }
      )
    }

    console.log('File download authorized:', {
      fileId,
      userEmail,
      authReason,
    })

    return serveFile(fileId)
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}

/**
 * Serve the file content
 */
async function serveFile(fileId: string): Promise<NextResponse> {
  const fileData = await downloadFileFromStorage(fileId)

  if (!fileData) {
    return NextResponse.json(
      { error: 'File data not available' },
      { status: 404 }
    )
  }

  // Convert Buffer to Uint8Array for NextResponse compatibility
  const body = new Uint8Array(fileData.buffer)

  const response = new NextResponse(body, {
    headers: {
      'Content-Type': fileData.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.filename)}"`,
      'Content-Length': fileData.buffer.length.toString(),
      'Cache-Control': 'private, max-age=3600', // 1 hour, private (not shared caches)
    },
  })

  return response
}
