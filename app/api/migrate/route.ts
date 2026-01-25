import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

// This endpoint should only be called manually or during initial setup
// In production, you should run migrations separately, not via API
export async function POST(request: NextRequest) {
  // Add basic security - only allow in development or with a secret token
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.MIGRATION_SECRET_TOKEN || 'migrate-now'
  
  if (process.env.NODE_ENV === 'production' && (!expectedToken || authHeader !== `Bearer ${expectedToken}`)) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide Authorization: Bearer migrate-now header' },
      { status: 401 }
    )
  }

  // Use direct connection for migration
  const dbUrl = process.env.DATABASE_URL || ''
  let directUrl = process.env.DIRECT_URL
  
  // If no DIRECT_URL, try to derive it from pooler URL
  if (!directUrl && dbUrl.includes('pooler')) {
    const match = dbUrl.match(/postgres\.([^:]+):([^@]+)@[^:]+:\d+\/([^?]+)/)
    if (match) {
      const [, projectRef, password, database] = match
      directUrl = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/${database}?sslmode=require`
    }
  }
  
  if (!directUrl) {
    return NextResponse.json({
      success: false,
      error: 'DIRECT_URL not configured. Cannot run migration without direct connection.',
    }, { status: 500 })
  }

  // Create Prisma client with direct connection
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
  })
  
  try {
    // Check if tables exist using direct connection
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
      // Try to push schema
      const { execSync } = await import('child_process')
      try {
        // Temporarily set DATABASE_URL to direct connection
        const originalUrl = process.env.DATABASE_URL
        process.env.DATABASE_URL = directUrl
        
        execSync('npx prisma db push --skip-generate --accept-data-loss', {
          stdio: 'inherit',
          env: process.env,
        })
        
        process.env.DATABASE_URL = originalUrl
        
        // Verify tables now exist
        const newTables = await prisma.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename
        `
        
        return NextResponse.json({
          success: true,
          message: 'Migration completed successfully',
          tables: newTables.map(t => t.tablename),
        })
      } catch (migrationError) {
        return NextResponse.json({
          success: false,
          error: 'Migration failed',
          details: migrationError instanceof Error ? migrationError.message : 'Unknown error',
          missingTables,
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database is properly configured',
      tables: existingTables,
      connectionInfo: {
        usesPooler: dbUrl.includes('pooler') || false,
        hasPgbouncer: dbUrl.includes('pgbouncer') || false,
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
