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

// For Supabase pooler visibility issues: if USE_DIRECT_CONNECTION is set to 'true',
// use direct connection instead of pooler
// This is a workaround for pooler not being able to see tables
const shouldUseDirect = process.env.USE_DIRECT_CONNECTION === 'true' && directUrl

// If we should use direct connection, temporarily override DATABASE_URL
// Note: This only works if DIRECT_URL is set in environment variables
if (shouldUseDirect && directUrl) {
  // Save original
  const originalUrl = process.env.DATABASE_URL
  // Override for Prisma
  process.env.DATABASE_URL = directUrl
}

const prismaClientOptions: any = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma