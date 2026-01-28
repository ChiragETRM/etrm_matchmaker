import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Cron job to cleanup abandoned application sessions
// Sessions older than 24 hours that are still IN_PROGRESS are marked as ABANDONED
//
// This should be called periodically (e.g., daily) via:
// - Vercel Cron: Add to vercel.json
// - GitHub Actions: Schedule a workflow
// - External cron service: Call this endpoint with Authorization header
//
// Environment variables:
//   CRON_SECRET - Optional secret for authorization

const ABANDONED_THRESHOLD_HOURS = 24

export async function POST(request: NextRequest) {
  try {
    // Optional authorization check
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - ABANDONED_THRESHOLD_HOURS)

    // Mark old IN_PROGRESS sessions as ABANDONED
    const result = await prisma.applicationSession.updateMany({
      where: {
        status: 'IN_PROGRESS',
        createdAt: {
          lt: cutoffDate,
        },
      },
      data: {
        status: 'ABANDONED',
        completedAt: new Date(),
      },
    })

    console.log(`Cleanup sessions: marked ${result.count} sessions as ABANDONED`)

    // Also cleanup any orphaned PASSED sessions that were never completed
    // (candidate passed gate but never submitted application)
    const passedCutoff = new Date()
    passedCutoff.setHours(passedCutoff.getHours() - 48) // 48 hours for PASSED sessions

    const passedResult = await prisma.applicationSession.updateMany({
      where: {
        status: 'PASSED',
        applicationId: null, // No application was ever created
        createdAt: {
          lt: passedCutoff,
        },
      },
      data: {
        status: 'ABANDONED',
        completedAt: new Date(),
      },
    })

    console.log(`Cleanup sessions: marked ${passedResult.count} orphaned PASSED sessions as ABANDONED`)

    // Get counts for reporting
    const stats = await prisma.applicationSession.groupBy({
      by: ['status'],
      _count: true,
    })

    return NextResponse.json({
      success: true,
      cleaned: {
        inProgress: result.count,
        orphanedPassed: passedResult.count,
      },
      stats: stats.reduce((acc, s) => {
        acc[s.status] = s._count
        return acc
      }, {} as Record<string, number>),
    })
  } catch (error) {
    console.error('Error cleaning up sessions:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup sessions' },
      { status: 500 }
    )
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request)
}
