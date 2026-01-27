import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check if users table exists
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'users'
    `
    
    if (tables.length === 0) {
      return NextResponse.json({
        healthy: false,
        error: 'users table does not exist',
        needsMigration: true,
      }, { status: 500 })
    }

    // Check if required NextAuth columns exist
    const nextAuthColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('created_at', 'updated_at')
    `
    const nextAuthColumnNames = nextAuthColumns.map(c => c.column_name)
    const hasNextAuthColumns = nextAuthColumnNames.includes('created_at') && 
                               nextAuthColumnNames.includes('updated_at')

    // Check if Google profile columns exist
    const googleColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('given_name', 'family_name', 'locale', 'google_sub', 'profile_data')
    `
    const googleColumnNames = googleColumns.map(c => c.column_name)
    const requiredGoogleColumns = ['given_name', 'family_name', 'locale', 'google_sub', 'profile_data']
    const missingGoogleColumns = requiredGoogleColumns.filter(c => !googleColumnNames.includes(c))
    const hasGoogleColumns = missingGoogleColumns.length === 0

    // Check if accounts table exists (required for NextAuth)
    const accountsTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'accounts'
    `
    const hasAccountsTable = accountsTable.length > 0

    // Check if sessions table exists (required for NextAuth)
    const sessionsTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'sessions'
    `
    const hasSessionsTable = sessionsTable.length > 0

    const healthy = hasNextAuthColumns && hasGoogleColumns && hasAccountsTable && hasSessionsTable
    const needsMigration = !hasNextAuthColumns || !hasGoogleColumns

    return NextResponse.json({
      healthy,
      needsMigration,
      schema: {
        usersTable: true,
        accountsTable: hasAccountsTable,
        sessionsTable: hasSessionsTable,
        nextAuthColumns: {
          exists: hasNextAuthColumns,
          columns: nextAuthColumnNames,
          missing: ['created_at', 'updated_at'].filter(c => !nextAuthColumnNames.includes(c)),
        },
        googleProfileColumns: {
          exists: hasGoogleColumns,
          columns: googleColumnNames,
          missing: missingGoogleColumns,
        },
      },
      recommendations: [
        !hasNextAuthColumns && 'Run: npm run db:apply-nextauth-migration',
        !hasGoogleColumns && 'Run: npm run db:apply-google-profile-migration',
        !hasAccountsTable && 'Run: npm run db:push (accounts table missing)',
        !hasSessionsTable && 'Run: npm run db:push (sessions table missing)',
      ].filter(Boolean),
    }, { status: healthy ? 200 : 500 })
  } catch (error) {
    return NextResponse.json({
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      needsMigration: true,
    }, { status: 500 })
  }
}
