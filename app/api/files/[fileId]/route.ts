import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// File download endpoint
// In production, generate signed URLs from S3/R2/Supabase

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileObject = await prisma.fileObject.findUnique({
      where: { id: params.fileId },
    })

    if (!fileObject) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Redirect to download endpoint so CV/resume links (e.g. from emails) always get the file, not JSON
    const requestUrl = new URL(request.url)
    const downloadUrl = `${requestUrl.origin}/api/files/${fileObject.id}/download`
    return NextResponse.redirect(downloadUrl, 302)
  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}