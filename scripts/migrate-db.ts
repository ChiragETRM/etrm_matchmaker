import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

async function migrate() {
  try {
    console.log('Starting database migration...')
    
    // First, try to push the schema
    console.log('Pushing schema to database...')
    execSync('npx prisma db push --skip-generate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    console.log('Schema pushed successfully!')
    
    // Verify connection by checking if tables exist
    console.log('Verifying tables...')
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `
    
    console.log('Existing tables:', tables.map(t => t.tablename))
    
    const requiredTables = ['jobs', 'questionnaires', 'questions', 'gate_rules', 'application_sessions', 'applications', 'file_objects', 'mail_logs']
    const existingTableNames = tables.map(t => t.tablename)
    const missingTables = requiredTables.filter(t => !existingTableNames.includes(t))
    
    if (missingTables.length > 0) {
      console.error('Missing tables:', missingTables)
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`)
    }
    
    console.log('All required tables exist!')
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration error:', error)
    process.exit(1)
  })
