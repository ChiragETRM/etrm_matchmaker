import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test basic connection
    await prisma.$connect()
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    // Check current database and schema
    const dbInfo = await prisma.$queryRaw<Array<{ current_database: string, current_schema: string }>>`
      SELECT current_database(), current_schema()
    `
    
    // Check if jobs table exists
    const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
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
    
    // Get connection info (without exposing sensitive data)
    const dbUrl = process.env.DATABASE_URL
    const hasDbUrl = !!dbUrl
    const dbUrlLength = dbUrl?.length || 0
    const dbUrlStart = dbUrl?.substring(0, 20) || ''
    const usesPooler = dbUrl?.includes('pooler') || false
    const hasPgbouncer = dbUrl?.includes('pgbouncer') || false
    const hasSsl = dbUrl?.includes('sslmode') || false
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      connectionInfo: {
        hasConnectionString: hasDbUrl,
        connectionStringLength: dbUrlLength,
        connectionStringPreview: dbUrlStart + '...',
        usesPooler,
        hasPgbouncerParam: hasPgbouncer,
        hasSslParam: hasSsl,
      },
      databaseInfo: dbInfo[0],
      jobsTableExists: tableCheck[0]?.exists || false,
      allTables: allTables.map(t => t.tablename),
      testQuery: result,
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    
    const errorInfo: any = {
      success: false,
      message: 'Database connection failed',
    }
    
    if (error instanceof Error) {
      errorInfo.error = {
        name: error.name,
        message: error.message,
        code: (error as any).code,
      }
    }
    
    // Check if DATABASE_URL is set
    const hasDbUrl = !!process.env.DATABASE_URL
    errorInfo.connectionInfo = {
      hasConnectionString: hasDbUrl,
      connectionStringLength: process.env.DATABASE_URL?.length || 0,
    }
    
    return NextResponse.json(errorInfo, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
