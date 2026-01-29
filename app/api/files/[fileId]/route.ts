import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/files/[fileId] — redirects to the download endpoint so that
// "download here" links (e.g. in emails) always trigger a file download,
// never JSON metadata.

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

    const downloadPath = `/api/files/${params.fileId}/download`
    const redirectUrl = new URL(downloadPath, request.url)
    return NextResponse.redirect(redirectUrl, 302)
  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}