import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

// Helper function to convert pooler URL to direct URL if needed
function getDirectUrl(poolerUrl: string): string | undefined {
  if (!poolerUrl.includes('pooler')) {
    return undefined
  }
  
  // Convert pooler URL to direct URL
  // pooler: postgres.PROJECT_REF:PASSWORD@pooler-host:6543/database
  // direct: postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/database
  const match = poolerUrl.match(/postgres\.([^:]+):([^@]+)@[^:]+:\d+\/([^?]+)/)
  if (match) {
    const [, projectRef, password, database] = match
    return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/${database}?sslmode=require`
  }
  return undefined
}

// Get connection URLs - prefer DIRECT_URL, fallback to converting pooler URL
const dbUrl = process.env.DATABASE_URL || ''
const directUrl = process.env.DIRECT_URL || getDirectUrl(dbUrl)

// Use direct connection for migrations if available, otherwise use DATABASE_URL
const connectionUrl = directUrl || dbUrl

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  }
})

async function applyNextAuthMigration() {
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
    
    console.log(`Executing ${statements.length} SQL statements...`)
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement.length === 0) continue
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      await prisma.$executeRawUnsafe(statement)
    }
    
    console.log('✅ Migration executed successfully!')
    
    // Verify the columns exist
    console.log('Verifying columns...')
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name
    `
    
    const existingColumns = result.map(r => r.column_name)
    console.log('Existing columns:', existingColumns)
    
    if (existingColumns.includes('created_at') && existingColumns.includes('updated_at')) {
      console.log('✅ Both created_at and updated_at columns exist!')
    } else {
      const missing = ['created_at', 'updated_at'].filter(c => !existingColumns.includes(c))
      throw new Error(`Missing columns: ${missing.join(', ')}`)
    }
    
    console.log('✅ Migration verification completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

applyNextAuthMigration()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
