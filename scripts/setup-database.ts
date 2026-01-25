import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

async function setupDatabase() {
  console.log('Setting up database...')
  
  // Get the connection string
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  console.log('Connection string format:', dbUrl.includes('pooler') ? 'Using pooler' : 'Using direct connection')
  
  // For migrations, we need the direct connection, not the pooler
  // If using pooler, we need to switch to direct connection
  let directConnectionUrl = dbUrl
  
  if (dbUrl.includes('pooler')) {
    console.log('⚠️  Warning: Connection pooler detected. Migrations require direct connection.')
    console.log('Converting pooler URL to direct connection URL...')
    
    // Convert pooler URL to direct connection URL
    // pooler: postgres.vfzrctelpzvzsnnqovzs:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres
    // direct: postgres:password@db.cmwcogsixtdtyibpalzr.supabase.co:5432/postgres
    
    // Extract password from pooler URL
    const poolerMatch = dbUrl.match(/postgres\.([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
    if (poolerMatch) {
      const [, projectRef, password, host, port, database] = poolerMatch
      
      // Construct direct connection URL
      // The project ref is the part before the dot in the pooler user
      directConnectionUrl = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/${database}?sslmode=require`
      
      console.log('Using direct connection for migration...')
    } else {
      console.log('Could not parse pooler URL, using original connection string')
    }
  }
  
  // Set the direct connection URL temporarily
  process.env.DATABASE_URL = directConnectionUrl
  
  try {
    // Run prisma db push with direct connection
    console.log('Running prisma db push...')
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: directConnectionUrl
      }
    })
    
    console.log('✅ Schema pushed successfully!')
    
    // Verify tables exist
    console.log('Verifying tables...')
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: directConnectionUrl
        }
      }
    })
    
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    
    const existingTables = tables.map(t => t.tablename)
    console.log('Existing tables:', existingTables)
    
    const requiredTables = ['jobs', 'questionnaires', 'questions', 'gate_rules', 'application_sessions', 'applications', 'file_objects', 'mail_logs']
    const missingTables = requiredTables.filter(t => !existingTables.includes(t))
    
    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`)
    }
    
    console.log('✅ All required tables exist!')
    console.log('✅ Database setup completed successfully!')
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    throw error
  } finally {
    // Restore original connection string
    process.env.DATABASE_URL = dbUrl
  }
}

setupDatabase()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Setup error:', error)
    process.exit(1)
  })
