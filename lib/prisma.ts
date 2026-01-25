import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

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

// Configure Prisma for Supabase connection pooling
const dbUrl = process.env.DATABASE_URL || ''
const directUrl = process.env.DIRECT_URL || getDirectUrl(dbUrl)

const prismaClientOptions: any = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}

// If we have a direct URL and are using a pooler, configure Prisma to use directUrl for migrations
if (directUrl && dbUrl.includes('pooler')) {
  prismaClientOptions.datasources = {
    db: {
      url: dbUrl,
      directUrl: directUrl,
    },
  }
  console.log('Prisma configured with pooler + direct URL fallback')
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma