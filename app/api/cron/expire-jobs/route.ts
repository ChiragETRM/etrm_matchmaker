import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Optional cron endpoint to mark expired jobs
// Can be called by a cron service (Vercel Cron, GitHub Actions, etc.)

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication header check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const result = await prisma.job.updateMany({
      where: {
        expiresAt: { lte: now },
        status: 'ACTIVE',
      },
      data: {
        status: 'EXPIRED',
      },
    })

    return NextResponse.json({
      success: true,
      expired: result.count,
    })
  } catch (error) {
    console.error('Error expiring jobs:', error)
    return NextResponse.json(
      { error: 'Failed to expire jobs' },
      { status: 500 }
    )
  }
}

// Also allow GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request)
}