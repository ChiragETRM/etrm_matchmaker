import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

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

// Get connection URLs
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

async function checkSchema() {
  try {
    console.log('Checking database schema...')
    
    // Check if users table exists
    const usersTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'users'
    `
    
    if (usersTable.length === 0) {
      throw new Error('users table does not exist. Run: npm run db:push')
    }
    
    // Check NextAuth columns
    const nextAuthColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('created_at', 'updated_at')
    `
    const nextAuthColumnNames = nextAuthColumns.map(c => c.column_name)
    const hasCreatedAt = nextAuthColumnNames.includes('created_at')
    const hasUpdatedAt = nextAuthColumnNames.includes('updated_at')
    
    // Check Google profile columns
    const googleColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('given_name', 'family_name', 'locale', 'google_sub', 'profile_data')
    `
    const googleColumnNames = googleColumns.map(c => c.column_name)
    const requiredGoogleColumns = ['given_name', 'family_name', 'locale', 'google_sub', 'profile_data']
    const missingGoogleColumns = requiredGoogleColumns.filter(c => !googleColumnNames.includes(c))
    
    console.log('\nSchema Status:')
    console.log('  Users table:', usersTable.length > 0 ? '✅' : '❌')
    console.log('  NextAuth columns:')
    console.log('    created_at:', hasCreatedAt ? '✅' : '❌')
    console.log('    updated_at:', hasUpdatedAt ? '✅' : '❌')
    console.log('  Google profile columns:')
    requiredGoogleColumns.forEach(col => {
      const exists = googleColumnNames.includes(col)
      console.log(`    ${col}:`, exists ? '✅' : '❌')
    })
    
    const needsNextAuthMigration = !hasCreatedAt || !hasUpdatedAt
    const needsGoogleMigration = missingGoogleColumns.length > 0
    
    if (needsNextAuthMigration || needsGoogleMigration) {
      console.log('\n⚠️  Schema issues detected!')
      
      if (needsNextAuthMigration) {
        console.log('  Missing NextAuth columns. Running migration...')
        try {
          execSync('npm run db:apply-nextauth-migration', { stdio: 'inherit' })
          console.log('  ✅ NextAuth migration completed')
        } catch (error) {
          console.error('  ❌ NextAuth migration failed:', error)
          throw error
        }
      }
      
      if (needsGoogleMigration) {
        console.log('  Missing Google profile columns. Running migration...')
        try {
          execSync('npm run db:apply-google-profile-migration', { stdio: 'inherit' })
          console.log('  ✅ Google profile migration completed')
        } catch (error) {
          console.error('  ❌ Google profile migration failed:', error)
          throw error
        }
      }
      
      // Regenerate Prisma client after migrations
      console.log('\nRegenerating Prisma client...')
      try {
        execSync('npm run db:generate', { stdio: 'inherit' })
        console.log('  ✅ Prisma client regenerated')
      } catch (error) {
        console.error('  ❌ Prisma client regeneration failed:', error)
        throw error
      }
      
      // Verify again by checking columns
      console.log('\nVerifying schema after migrations...')
      const verifyNextAuth = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('created_at', 'updated_at')
      `
      const verifyGoogle = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('given_name', 'family_name', 'locale', 'google_sub', 'profile_data')
      `
      const allNextAuth = verifyNextAuth.map(c => c.column_name)
      const allGoogle = verifyGoogle.map(c => c.column_name)
      const allGood = allNextAuth.includes('created_at') && 
                      allNextAuth.includes('updated_at') &&
                      ['given_name', 'family_name', 'locale', 'google_sub', 'profile_data'].every(c => allGoogle.includes(c))
      
      if (allGood) {
        console.log('\n✅ All required columns exist after migration!')
        return { success: true, needsMigration: false }
      } else {
        throw new Error('Migrations completed but verification failed. Please check manually.')
      }
    } else {
      console.log('\n✅ All required columns exist!')
      return { success: true, needsMigration: false }
    }
  } catch (error) {
    console.error('\n❌ Schema check failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkSchema()
  .then((result) => {
    if (result?.success) {
      console.log('\n✅ Schema is correct!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Schema check completed with warnings')
      process.exit(0)
    }
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
