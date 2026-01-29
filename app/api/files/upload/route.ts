import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'

// Simple file storage implementation for MVP
// In production, replace with S3/R2/Supabase Storage

export async function POST(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimit = checkRateLimit(`file-upload:${ip}`)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'resumes'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File must be less than 5MB' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and DOCX files are allowed' },
        { status: 400 }
      )
    }

    // For MVP, we'll store file metadata and data in database
    // In production, upload to S3/R2/Supabase and store the actual path
    const buffer = await file.arrayBuffer()
    const checksum = randomBytes(16).toString('hex')

    // Convert buffer to base64 for storage
    const base64Data = Buffer.from(buffer).toString('base64')

    // Sanitize file name to prevent path traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

    const fileObject = await prisma.fileObject.create({
      data: {
        provider: 'LOCAL', // Change to S3/R2/SUPABASE in production
        path: `${folder}/${Date.now()}-${safeName}`,
        mimeType: file.type,
        sizeBytes: buffer.byteLength,
        checksum,
        data: base64Data,
      },
    })

    return NextResponse.json({
      fileId: fileObject.id,
      path: fileObject.path,
      url: `/api/files/${fileObject.id}`,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}