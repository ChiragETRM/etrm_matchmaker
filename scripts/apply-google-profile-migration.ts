import { PrismaClient } from '@prisma/client'

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

async function applyGoogleProfileMigration() {
  try {
    console.log('Starting Google profile fields migration...')
    console.log('Connection URL format:', connectionUrl.includes('pooler') ? 'Pooler (converted to direct)' : 'Direct')
    
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
        RAISE NOTICE 'Added given_name column';
    ELSE
        RAISE NOTICE 'given_name column already exists';
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
        RAISE NOTICE 'Added family_name column';
    ELSE
        RAISE NOTICE 'family_name column already exists';
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
        RAISE NOTICE 'Added locale column';
    ELSE
        RAISE NOTICE 'locale column already exists';
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
        RAISE NOTICE 'Added google_sub column';
    ELSE
        RAISE NOTICE 'google_sub column already exists';
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
        RAISE NOTICE 'Added profile_data column';
    ELSE
        RAISE NOTICE 'profile_data column already exists';
    END IF;
END $$;`,
      // Create index on google_sub if it doesn't exist
      `CREATE INDEX IF NOT EXISTS "users_google_sub_idx" ON "users"("google_sub");`,
    ]
    
    console.log(`Executing ${statements.length} SQL statements...`)
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement.length === 0) continue
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        await prisma.$executeRawUnsafe(statement)
        console.log(`✅ Statement ${i + 1} executed successfully`)
      } catch (error) {
        // Log error but continue - some errors are expected (like index already exists)
        if (error instanceof Error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`)
            continue
          }
        }
        console.error(`❌ Statement ${i + 1} failed:`, error)
        throw error
      }
    }
    
    console.log('✅ Migration executed successfully!')
    
    // Verify the columns exist
    console.log('Verifying columns...')
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('given_name', 'family_name', 'locale', 'google_sub', 'profile_data')
      ORDER BY column_name
    `
    
    const existingColumns = result.map(r => r.column_name)
    console.log('Existing columns:', existingColumns)
    
    const requiredColumns = ['given_name', 'family_name', 'locale', 'google_sub', 'profile_data']
    const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c))
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist!')
    } else {
      throw new Error(`Missing columns: ${missingColumns.join(', ')}`)
    }
    
    // Verify index exists
    const indexResult = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'users_google_sub_idx'
    `
    
    if (indexResult.length > 0) {
      console.log('✅ Index users_google_sub_idx exists!')
    } else {
      console.log('⚠️  Index users_google_sub_idx not found (may need manual creation)')
    }
    
    console.log('✅ Migration verification completed successfully!')
    
    return {
      success: true,
      existingColumns,
      missingColumns: [],
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

applyGoogleProfileMigration()
  .then((result) => {
    console.log('Done!', result)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
