import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  resumeFileId: z.string().optional().nullable(),
})

export const dynamic = 'force-dynamic'

/**
 * PATCH
 * Updates candidate profile information (name, phone, linkedin, resumeFileId)
 * The resumeFileId should be obtained from /api/files/upload first
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const email = session.user.email
    const body = await request.json()
    const data = bodySchema.parse(body)

    // Update user's name if provided
    if (data.name !== undefined) {
      await prisma.user.update({
        where: { email },
        data: { name: data.name },
      })
    }

    // Update all applications for this candidate with the new info
    // This ensures future applications use the updated info
    const updateData: any = {}
    if (data.phone !== undefined) updateData.candidatePhone = data.phone
    if (data.linkedin !== undefined) updateData.candidateLinkedin = data.linkedin
    if (data.resumeFileId !== undefined) updateData.resumeFileId = data.resumeFileId

    if (Object.keys(updateData).length > 0) {
      await prisma.application.updateMany({
        where: { candidateEmail: email },
        data: updateData,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating candidate profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
