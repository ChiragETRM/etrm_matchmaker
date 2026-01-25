/**
 * This script helps diagnose and fix the Supabase connection pooler issue
 * where tables exist but aren't visible through the pooler connection.
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

async function fixPoolerIssue() {
  console.log('🔍 Diagnosing Supabase connection pooler issue...\n')
  
  const poolerUrl = process.env.DATABASE_URL
  if (!poolerUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  if (!poolerUrl.includes('pooler')) {
    console.log('⚠️  DATABASE_URL does not appear to be a pooler connection')
    console.log('This script is designed for pooler connection issues')
    return
  }
  
  // Extract direct connection URL from pooler URL
  console.log('📝 Extracting direct connection URL from pooler URL...')
  const poolerMatch = poolerUrl.match(/postgres\.([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(\?|$)/)
  
  if (!poolerMatch) {
    throw new Error('Could not parse pooler URL. Expected format: postgres.PROJECT_REF:PASSWORD@pooler-host:6543/database')
  }
  
  const [, projectRef, password, , , database, queryParams] = poolerMatch
  const directUrl = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/${database}?sslmode=require`
  
  console.log('✅ Direct connection URL extracted\n')
  
  // Test direct connection
  console.log('🔌 Testing direct connection...')
  const directPrisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl
      }
    }
  })
  
  try {
    const directTables = await directPrisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    
    console.log('✅ Direct connection works!')
    console.log(`   Found ${directTables.length} tables:`, directTables.map(t => t.tablename).join(', '))
    
    // Test pooler connection
    console.log('\n🔌 Testing pooler connection...')
    const poolerPrisma = new PrismaClient()
    
    try {
      const poolerTables = await poolerPrisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `
      
      console.log('✅ Pooler connection works!')
      console.log(`   Found ${poolerTables.length} tables:`, poolerTables.map(t => t.tablename).join(', '))
      
      if (poolerTables.length === 0) {
        console.log('\n❌ ISSUE DETECTED: Pooler cannot see tables!')
        console.log('\n💡 SOLUTION:')
        console.log('   1. The pooler connection might be connecting to a different database')
        console.log('   2. Try using the direct connection URL in Vercel temporarily')
        console.log('   3. Or ensure you\'re using "Transaction" mode in Supabase connection pooler settings')
        console.log('\n   Direct URL to use in Vercel:')
        console.log(`   ${directUrl.replace(password, '***')}`)
      }
      
    } catch (poolerError) {
      console.log('❌ Pooler connection failed:', poolerError instanceof Error ? poolerError.message : poolerError)
      console.log('\n💡 SOLUTION: Use direct connection URL in Vercel')
      console.log(`   ${directUrl.replace(password, '***')}`)
    } finally {
      await poolerPrisma.$disconnect()
    }
    
  } catch (directError) {
    console.log('❌ Direct connection failed:', directError instanceof Error ? directError.message : directError)
    throw directError
  } finally {
    await directPrisma.$disconnect()
  }
}

fixPoolerIssue()
  .then(() => {
    console.log('\n✅ Diagnosis complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
