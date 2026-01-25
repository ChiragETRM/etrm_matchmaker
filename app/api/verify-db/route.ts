import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const prisma = new PrismaClient()
  
  try {
    // Get database and schema info
    const dbInfo = await prisma.$queryRaw<Array<{ 
      current_database: string
      current_schema: string
      current_user: string
    }>>`
      SELECT 
        current_database(),
        current_schema(),
        current_user
    `
    
    // Check if jobs table exists using information_schema
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs'
      ) as exists
    `
    
    // List all tables in public schema
    const allTables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    
    // Try to query the jobs table directly
    let canQueryJobs = false
    let jobsQueryError = null
    try {
      await prisma.$queryRaw`SELECT COUNT(*) FROM jobs`
      canQueryJobs = true
    } catch (error) {
      jobsQueryError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Check connection string info
    const dbUrl = process.env.DATABASE_URL || ''
    const usesPooler = dbUrl.includes('pooler')
    const usesDirect = dbUrl.includes('db.') && !dbUrl.includes('pooler')
    
    return NextResponse.json({
      success: true,
      databaseInfo: dbInfo[0],
      tableCheck: {
        jobsTableExists: tableExists[0]?.exists || false,
        canQueryJobs,
        jobsQueryError,
      },
      allTables: allTables.map(t => t.tablename),
      connectionType: usesPooler ? 'pooler' : usesDirect ? 'direct' : 'unknown',
      connectionString: {
        usesPooler,
        usesDirect,
        hasPgbouncer: dbUrl.includes('pgbouncer'),
        hasSsl: dbUrl.includes('sslmode'),
        length: dbUrl.length,
      },
      diagnosis: {
        tablesVisible: allTables.length > 0,
        jobsTableVisible: tableExists[0]?.exists || false,
        jobsTableQueryable: canQueryJobs,
        issue: !canQueryJobs ? 'Jobs table exists but cannot be queried - likely a pooler configuration issue' : null,
      }
    })
  } catch (error) {
    console.error('Database verification failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
