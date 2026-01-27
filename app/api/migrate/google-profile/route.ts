import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Helper function to convert pooler URL to direct URL if needed
function getDirectUrl(poolerUrl: string): string | undefined {
  if (!poolerUrl.includes('pooler')) {
    return undefined
  }
  
  const match = poolerUrl.match(/postgres\.([^:]+):([^@]+)@[^:]+:\d+\/([^?]+)/)
  if (match) {
    const [, projectRef, password, database] = match
    return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/${database}?sslmode=require`
  }
  return undefined
}

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
  const directUrl = process.env.DIRECT_URL || getDirectUrl(dbUrl)
  const connectionUrl = directUrl || dbUrl

  if (!connectionUrl) {
    return NextResponse.json({
      success: false,
      error: 'DATABASE_URL not configured',
    }, { status: 500 })
  }

  // Create Prisma client with connection
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl
      }
    }
  })

  try {
    console.log('Starting Google profile fields migration...')
    
    // Define SQL statements to add Google profile fields
    const statements = [
      // Add given_name column if it doesn't exist
      `DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'given_name'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "given_name" TEXT;
    END IF;
END $$;`,
      // Add family_name column if it doesn't exist
      `DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'family_name'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "family_name" TEXT;
    END IF;
END $$;`,
      // Add locale column if it doesn't exist
      `DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'locale'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "locale" TEXT;
    END IF;
END $$;`,
      // Add google_sub column if it doesn't exist
      `DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'google_sub'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "google_sub" TEXT;
    END IF;
END $$;`,
      // Add profile_data column if it doesn't exist
      `DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_data'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "profile_data" TEXT;
    END IF;
END $$;`,
      // Create index on google_sub if it doesn't exist
      `CREATE INDEX IF NOT EXISTS "users_google_sub_idx" ON "users"("google_sub");`,
    ]
    
    const executedStatements: string[] = []
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement.length === 0) continue
      
      try {
        await prisma.$executeRawUnsafe(statement)
        executedStatements.push(`Statement ${i + 1} executed successfully`)
      } catch (error) {
        // If column/index already exists, that's okay
        if (error instanceof Error && (
          error.message.includes('already exists') || 
          error.message.includes('duplicate')
        )) {
          executedStatements.push(`Statement ${i + 1} skipped (already exists)`)
          continue
        }
        throw error
      }
    }
    
    // Verify the columns exist
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('given_name', 'family_name', 'locale', 'google_sub', 'profile_data')
      ORDER BY column_name
    `
    
    const existingColumns = result.map(r => r.column_name)
    const requiredColumns = ['given_name', 'family_name', 'locale', 'google_sub', 'profile_data']
    const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c))
    
    if (missingColumns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Google profile fields migration completed successfully',
        executedStatements,
        columns: existingColumns,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Migration completed but columns are missing: ${missingColumns.join(', ')}`,
        executedStatements,
        columns: existingColumns,
        missingColumns,
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Google profile migration failed:', error)
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
  const dbUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || getDirectUrl(dbUrl)
  const connectionUrl = directUrl || dbUrl

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl
      }
    }
  })

  try {
    // Check if columns exist
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('given_name', 'family_name', 'locale', 'google_sub', 'profile_data')
      ORDER BY column_name
    `
    
    const existingColumns = result.map(r => r.column_name)
    const requiredColumns = ['given_name', 'family_name', 'locale', 'google_sub', 'profile_data']
    const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c))
    
    return NextResponse.json({
      success: missingColumns.length === 0,
      existingColumns,
      missingColumns,
      allColumnsExist: missingColumns.length === 0,
    })
  } catch (error) {
    console.error('Google profile migration check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
