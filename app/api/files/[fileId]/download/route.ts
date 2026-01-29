import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// File download endpoint
// Downloads file from storage provider (Supabase/S3/R2) and returns it
// Protected: requires authentication and verifies the caller owns or recruits for the file

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Require authentication to download files
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to download files.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()

    const fileObject = await prisma.fileObject.findUnique({
      where: { id: params.fileId },
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

    // Authorization: user must be the candidate who uploaded, or the recruiter for the job
    const isOwner = fileObject.applications.some(
      (app) => app.candidateEmail.toLowerCase() === userEmail
    )
    const isRecruiter = fileObject.applications.some(
      (app) =>
        app.job.recruiterEmailTo.toLowerCase() === userEmail ||
        app.job.recruiterEmailCc.some((cc) => cc.toLowerCase() === userEmail)
    )

    if (!isOwner && !isRecruiter) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have access to this file.' },
        { status: 403 }
      )
    }

    // Use the file's actual provider, fallback to env var
    const fileProvider = fileObject.provider || process.env.STORAGE_PROVIDER || 'LOCAL'
    const provider = process.env.STORAGE_PROVIDER || 'LOCAL'

    // Handle Supabase Storage
    if ((fileProvider === 'SUPABASE' || provider === 'SUPABASE') && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      try {
        // Construct Supabase Storage public URL
        // Supabase Storage URLs follow pattern: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
        const bucket = 'resumes' // Default bucket, could be configurable
        const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '') // Remove trailing slash
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileObject.path}`
        
        // Fetch file from Supabase Storage
        const response = await fetch(publicUrl, {
          headers: {
            'apikey': process.env.SUPABASE_KEY,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch file from Supabase: ${response.statusText}`)
        }

        const fileBuffer = await response.arrayBuffer()
        const fileName = fileObject.path.split('/').pop() || 'download'
        const safeFileName = fileName.replace(/[^\x20-\x7E]/g, '_')
        const disposition = `attachment; filename="${safeFileName.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': fileObject.mimeType || 'application/octet-stream',
            'Content-Disposition': disposition,
            'Content-Length': fileObject.sizeBytes.toString(),
            'Cache-Control': 'private, no-cache',
          },
        })
      } catch (error) {
        console.error('Error downloading from Supabase:', error)
        return NextResponse.json(
          { error: 'Failed to download file from storage' },
          { status: 500 }
        )
      }
    }

    // Handle S3/R2 (TODO: implement)
    if (provider === 'S3' || provider === 'R2') {
      return NextResponse.json(
        { error: 'S3/R2 download not yet implemented' },
        { status: 501 }
      )
    }

    // LOCAL provider - retrieve file data from database
    if (fileProvider === 'LOCAL' || provider === 'LOCAL') {
      if (!fileObject.data) {
        return NextResponse.json(
          { 
            error: 'File data not available. This file was uploaded before file storage was configured. Please upload a new file.',
            code: 'FILE_DATA_MISSING'
          },
          { status: 404 }
        )
      }

      try {
        // Convert base64 data back to buffer
        const fileBuffer = Buffer.from(fileObject.data, 'base64')
        const fileName = fileObject.path.split('/').pop() || 'download'
        const safeFileName = fileName.replace(/[^\x20-\x7E]/g, '_')
        const disposition = `attachment; filename="${safeFileName.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': fileObject.mimeType || 'application/octet-stream',
            'Content-Disposition': disposition,
            'Content-Length': fileObject.sizeBytes.toString(),
            'Cache-Control': 'private, no-cache',
          },
        })
      } catch (error) {
        console.error('Error decoding file data:', error)
        return NextResponse.json(
          { error: 'Failed to decode file data' },
          { status: 500 }
        )
      }
    }

    // Unknown provider
    return NextResponse.json(
      { error: 'File storage not configured. Files are not actually stored in LOCAL mode.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error downloading file:', error)
    
    // Check if error is related to missing column
    if (error instanceof Error && error.message.includes('data')) {
      return NextResponse.json(
        { 
          error: 'Database schema needs to be updated. Please run the migration to add the data column.',
          code: 'SCHEMA_OUTDATED'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
