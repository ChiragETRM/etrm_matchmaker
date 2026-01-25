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

// Get connection URLs
const dbUrl = process.env.DATABASE_URL || ''
const directUrl = process.env.DIRECT_URL || getDirectUrl(dbUrl)

// If using pooler and it's having issues, use direct connection as fallback
// This is a workaround for Supabase pooler visibility issues
const useDirectConnection = dbUrl.includes('pooler') && !directUrl
  ? false // Can't use direct if we can't derive it
  : dbUrl.includes('pooler') && process.env.USE_DIRECT_CONNECTION === 'true'
  ? true // Explicitly use direct if env var is set
  : !dbUrl.includes('pooler') // Use whatever is in DATABASE_URL if not pooler

const effectiveUrl = useDirectConnection && directUrl ? directUrl : dbUrl

// Configure Prisma
const prismaClientOptions: any = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}

// Only override datasources if we're using a different URL than DATABASE_URL
if (effectiveUrl !== dbUrl) {
  prismaClientOptions.datasources = {
    db: {
      url: effectiveUrl,
    },
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma