import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

// This endpoint should only be called manually or during initial setup
// In production, you should run migrations separately, not via API
export async function POST(request: NextRequest) {
  // Add basic security - only allow in development or with a secret token
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.MIGRATION_SECRET_TOKEN
  
  if (process.env.NODE_ENV === 'production' && (!expectedToken || authHeader !== `Bearer ${expectedToken}`)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const prisma = new PrismaClient()
  
  try {
    // Check if tables exist
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    
    const existingTables = tables.map(t => t.tablename)
    const requiredTables = ['jobs', 'questionnaires', 'questions', 'gate_rules', 'application_sessions', 'applications', 'file_objects', 'mail_logs']
    const missingTables = requiredTables.filter(t => !existingTables.includes(t))
    
    if (missingTables.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Missing tables detected',
        existingTables,
        missingTables,
        action: 'Please run: npx prisma db push (using direct connection, not pooler)'
      }, { status: 500 })
    }
    
    // Test a simple query to verify connection works
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      success: true,
      message: 'Database is properly configured',
      tables: existingTables,
      connectionInfo: {
        usesPooler: process.env.DATABASE_URL?.includes('pooler') || false,
        hasPgbouncer: process.env.DATABASE_URL?.includes('pgbouncer') || false,
      }
    })
  } catch (error) {
    console.error('Migration check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  const prisma = new PrismaClient()
  
  try {
    // Check if tables exist
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    
    const existingTables = tables.map(t => t.tablename)
    const requiredTables = ['jobs', 'questionnaires', 'questions', 'gate_rules', 'application_sessions', 'applications', 'file_objects', 'mail_logs']
    const missingTables = requiredTables.filter(t => !existingTables.includes(t))
    
    return NextResponse.json({
      success: missingTables.length === 0,
      existingTables,
      missingTables,
      allTablesExist: missingTables.length === 0,
      connectionInfo: {
        usesPooler: process.env.DATABASE_URL?.includes('pooler') || false,
        hasPgbouncer: process.env.DATABASE_URL?.includes('pgbouncer') || false,
        connectionStringLength: process.env.DATABASE_URL?.length || 0,
      }
    })
  } catch (error) {
    console.error('Migration check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
