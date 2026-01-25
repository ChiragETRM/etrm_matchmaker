import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Prisma for Supabase connection pooling
// For connection poolers, we need to ensure proper connection handling
const prismaClientOptions: any = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}

// Add connection pool configuration for Supabase pooler
if (process.env.DATABASE_URL?.includes('pooler')) {
  prismaClientOptions.datasources = {
    db: {
      url: process.env.DATABASE_URL,
    },
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma