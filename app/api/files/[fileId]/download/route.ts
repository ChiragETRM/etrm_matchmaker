import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// File download endpoint
// Downloads file from storage provider (Supabase/S3/R2) and returns it

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

    const provider = process.env.STORAGE_PROVIDER || 'LOCAL'

    // Handle Supabase Storage
    if (provider === 'SUPABASE' && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': fileObject.mimeType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Content-Length': fileObject.sizeBytes.toString(),
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

    // LOCAL provider - file not actually stored
    return NextResponse.json(
      { error: 'File storage not configured. Files are not actually stored in LOCAL mode.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
