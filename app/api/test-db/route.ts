import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test basic connection
    await prisma.$connect()
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    // Get connection info (without exposing sensitive data)
    const dbUrl = process.env.DATABASE_URL
    const hasDbUrl = !!dbUrl
    const dbUrlLength = dbUrl?.length || 0
    const dbUrlStart = dbUrl?.substring(0, 20) || ''
    const usesPooler = dbUrl?.includes('pooler') || false
    const hasPgbouncer = dbUrl?.includes('pgbouncer') || false
    const hasSsl = dbUrl?.includes('sslmode') || false
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      connectionInfo: {
        hasConnectionString: hasDbUrl,
        connectionStringLength: dbUrlLength,
        connectionStringPreview: dbUrlStart + '...',
        usesPooler,
        hasPgbouncerParam: hasPgbouncer,
        hasSslParam: hasSsl,
      },
      testQuery: result,
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    
    const errorInfo: any = {
      success: false,
      message: 'Database connection failed',
    }
    
    if (error instanceof Error) {
      errorInfo.error = {
        name: error.name,
        message: error.message,
        code: (error as any).code,
      }
    }
    
    // Check if DATABASE_URL is set
    const hasDbUrl = !!process.env.DATABASE_URL
    errorInfo.connectionInfo = {
      hasConnectionString: hasDbUrl,
      connectionStringLength: process.env.DATABASE_URL?.length || 0,
    }
    
    return NextResponse.json(errorInfo, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
