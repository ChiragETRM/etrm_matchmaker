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
    console.log('Starting NextAuth columns migration...')
    
    // Define SQL statements individually to avoid parsing issues
    const statements = [
      // Add created_at column if it doesn't exist
      `DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;`,
      // Add updated_at column if it doesn't exist
      `DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;`,
      // Create function to update updated_at
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';`,
      // Drop trigger if exists
      `DROP TRIGGER IF EXISTS update_users_updated_at ON "users";`,
      // Create trigger
      `CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();`
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
        // If column already exists, that's okay
        if (error instanceof Error && error.message.includes('already exists')) {
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
      AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name
    `
    
    const existingColumns = result.map(r => r.column_name)
    
    if (existingColumns.includes('created_at') && existingColumns.includes('updated_at')) {
      return NextResponse.json({
        success: true,
        message: 'NextAuth migration completed successfully',
        executedStatements,
        columns: existingColumns,
      })
    } else {
      const missing = ['created_at', 'updated_at'].filter(c => !existingColumns.includes(c))
      return NextResponse.json({
        success: false,
        error: `Migration completed but columns are missing: ${missing.join(', ')}`,
        executedStatements,
        columns: existingColumns,
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('NextAuth migration failed:', error)
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
      AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name
    `
    
    const existingColumns = result.map(r => r.column_name)
    const requiredColumns = ['created_at', 'updated_at']
    const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c))
    
    return NextResponse.json({
      success: missingColumns.length === 0,
      existingColumns,
      missingColumns,
      allColumnsExist: missingColumns.length === 0,
    })
  } catch (error) {
    console.error('NextAuth migration check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
