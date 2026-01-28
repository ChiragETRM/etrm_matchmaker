// File storage abstraction
// Supports S3, R2 (Cloudflare), Supabase Storage, or LOCAL (database)

import { prisma } from '@/lib/prisma'
import { randomBytes, createHash } from 'crypto'

interface UploadResult {
  fileId: string
  path: string
  url: string
}

interface SignedUrlResult {
  url: string
  expiresAt: Date
}

// Get storage provider from environment
function getProvider(): 'S3' | 'R2' | 'SUPABASE' | 'LOCAL' {
  const provider = process.env.STORAGE_PROVIDER?.toUpperCase()
  if (provider === 'S3' || provider === 'R2' || provider === 'SUPABASE') {
    return provider
  }
  return 'LOCAL'
}

export async function uploadFile(
  file: File,
  folder: string = 'resumes'
): Promise<UploadResult> {
  const provider = getProvider()

  switch (provider) {
    case 'S3':
      return uploadToS3(file, folder)
    case 'R2':
      return uploadToR2(file, folder)
    case 'SUPABASE':
      return uploadToSupabase(file, folder)
    default:
      return uploadToLocal(file, folder)
  }
}

/**
 * Generate a signed/time-limited URL for file download
 * This prevents unauthorized access to files
 */
export async function getSignedDownloadUrl(fileId: string): Promise<SignedUrlResult | null> {
  const fileObject = await prisma.fileObject.findUnique({
    where: { id: fileId },
  })

  if (!fileObject) {
    return null
  }

  const provider = fileObject.provider as 'S3' | 'R2' | 'SUPABASE' | 'LOCAL'

  switch (provider) {
    case 'S3':
      return getS3SignedUrl(fileObject.path)
    case 'R2':
      return getR2SignedUrl(fileObject.path)
    case 'SUPABASE':
      return getSupabaseSignedUrl(fileObject.path)
    default:
      // For LOCAL, return an internal URL with a time-limited token
      return getLocalSignedUrl(fileId)
  }
}

/**
 * Get a direct download URL (for internal use or when auth is handled separately)
 */
export async function getFileUrl(fileId: string): Promise<string> {
  return `/api/files/${fileId}/download`
}

// ============================================================================
// S3 Implementation (AWS S3 or compatible)
// ============================================================================

async function uploadToS3(file: File, folder: string): Promise<UploadResult> {
  const bucket = process.env.S3_BUCKET
  const region = process.env.S3_REGION || 'us-east-1'
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 credentials not configured. Required: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY')
  }

  const buffer = await file.arrayBuffer()
  const checksum = createHash('sha256').update(Buffer.from(buffer)).digest('hex')
  const fileKey = `${folder}/${Date.now()}-${randomBytes(8).toString('hex')}-${sanitizeFilename(file.name)}`

  // Use AWS SDK v3 style signing
  const endpoint = process.env.S3_ENDPOINT || `https://s3.${region}.amazonaws.com`
  const url = `${endpoint}/${bucket}/${fileKey}`

  const dateStr = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = dateStr.slice(0, 8)

  // Create canonical request for AWS Signature v4
  const headers: Record<string, string> = {
    'Host': new URL(endpoint).host,
    'Content-Type': file.type || 'application/octet-stream',
    'x-amz-content-sha256': checksum,
    'x-amz-date': dateStr,
  }

  const signedHeaders = Object.keys(headers).sort().join(';').toLowerCase()
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([k, v]) => `${k.toLowerCase()}:${v}`)
    .join('\n')

  const canonicalRequest = [
    'PUT',
    `/${bucket}/${fileKey}`,
    '',
    canonicalHeaders + '\n',
    signedHeaders,
    checksum,
  ].join('\n')

  const canonicalRequestHash = createHash('sha256').update(canonicalRequest).digest('hex')

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStr,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')

  // Calculate signature
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, 's3')
  const kSigning = hmacSha256(kService, 'aws4_request')
  const signature = hmacSha256(kSigning, stringToSign).toString('hex')

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...headers,
      'Authorization': authHeader,
    },
    body: Buffer.from(buffer),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`S3 upload failed: ${response.status} ${errorText}`)
  }

  // Store metadata in database (no file data)
  const fileObject = await prisma.fileObject.create({
    data: {
      provider: 'S3',
      path: fileKey,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.byteLength,
      checksum,
      data: null, // Don't store file data for cloud providers
    },
  })

  return {
    fileId: fileObject.id,
    path: fileKey,
    url: `/api/files/${fileObject.id}/download`,
  }
}

async function getS3SignedUrl(path: string): Promise<SignedUrlResult> {
  const bucket = process.env.S3_BUCKET!
  const region = process.env.S3_REGION || 'us-east-1'
  const accessKeyId = process.env.S3_ACCESS_KEY_ID!
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!
  const endpoint = process.env.S3_ENDPOINT || `https://s3.${region}.amazonaws.com`

  const expiresIn = 3600 // 1 hour
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  const dateStr = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = dateStr.slice(0, 8)
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': dateStr,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  })

  const canonicalRequest = [
    'GET',
    `/${bucket}/${path}`,
    queryParams.toString(),
    `host:${new URL(endpoint).host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const canonicalRequestHash = createHash('sha256').update(canonicalRequest).digest('hex')
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStr,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, 's3')
  const kSigning = hmacSha256(kService, 'aws4_request')
  const signature = hmacSha256(kSigning, stringToSign).toString('hex')

  queryParams.set('X-Amz-Signature', signature)

  return {
    url: `${endpoint}/${bucket}/${path}?${queryParams.toString()}`,
    expiresAt,
  }
}

// ============================================================================
// Cloudflare R2 Implementation (S3-compatible but with different signing)
// ============================================================================

async function uploadToR2(file: File, folder: string): Promise<UploadResult> {
  const accountId = process.env.R2_ACCOUNT_ID
  const bucket = process.env.R2_BUCKET
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured. Required: R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
  }

  const buffer = await file.arrayBuffer()
  const checksum = createHash('sha256').update(Buffer.from(buffer)).digest('hex')
  const fileKey = `${folder}/${Date.now()}-${randomBytes(8).toString('hex')}-${sanitizeFilename(file.name)}`

  // R2 uses S3-compatible API
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const url = `${endpoint}/${bucket}/${fileKey}`
  const region = 'auto' // R2 uses 'auto' as region

  const dateStr = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = dateStr.slice(0, 8)

  const headers: Record<string, string> = {
    'Host': `${accountId}.r2.cloudflarestorage.com`,
    'Content-Type': file.type || 'application/octet-stream',
    'x-amz-content-sha256': checksum,
    'x-amz-date': dateStr,
  }

  const signedHeaders = Object.keys(headers).sort().join(';').toLowerCase()
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([k, v]) => `${k.toLowerCase()}:${v}`)
    .join('\n')

  const canonicalRequest = [
    'PUT',
    `/${bucket}/${fileKey}`,
    '',
    canonicalHeaders + '\n',
    signedHeaders,
    checksum,
  ].join('\n')

  const canonicalRequestHash = createHash('sha256').update(canonicalRequest).digest('hex')
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStr,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, 's3')
  const kSigning = hmacSha256(kService, 'aws4_request')
  const signature = hmacSha256(kSigning, stringToSign).toString('hex')

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...headers,
      'Authorization': authHeader,
    },
    body: Buffer.from(buffer),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`R2 upload failed: ${response.status} ${errorText}`)
  }

  const fileObject = await prisma.fileObject.create({
    data: {
      provider: 'R2',
      path: fileKey,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.byteLength,
      checksum,
      data: null,
    },
  })

  return {
    fileId: fileObject.id,
    path: fileKey,
    url: `/api/files/${fileObject.id}/download`,
  }
}

async function getR2SignedUrl(path: string): Promise<SignedUrlResult> {
  const accountId = process.env.R2_ACCOUNT_ID!
  const bucket = process.env.R2_BUCKET!
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const region = 'auto'
  const expiresIn = 3600

  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  const dateStr = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = dateStr.slice(0, 8)
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': dateStr,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  })

  const canonicalRequest = [
    'GET',
    `/${bucket}/${path}`,
    queryParams.toString(),
    `host:${accountId}.r2.cloudflarestorage.com\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const canonicalRequestHash = createHash('sha256').update(canonicalRequest).digest('hex')
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStr,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, 's3')
  const kSigning = hmacSha256(kService, 'aws4_request')
  const signature = hmacSha256(kSigning, stringToSign).toString('hex')

  queryParams.set('X-Amz-Signature', signature)

  return {
    url: `${endpoint}/${bucket}/${path}?${queryParams.toString()}`,
    expiresAt,
  }
}

// ============================================================================
// Supabase Storage Implementation
// ============================================================================

async function uploadToSupabase(file: File, folder: string): Promise<UploadResult> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)')
  }

  const buffer = await file.arrayBuffer()
  const checksum = createHash('sha256').update(Buffer.from(buffer)).digest('hex')
  const fileKey = `${folder}/${Date.now()}-${randomBytes(8).toString('hex')}-${sanitizeFilename(file.name)}`
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'resumes'

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${fileKey}`

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: Buffer.from(buffer),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Supabase upload failed: ${response.status} ${errorText}`)
  }

  const fileObject = await prisma.fileObject.create({
    data: {
      provider: 'SUPABASE',
      path: fileKey,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.byteLength,
      checksum,
      data: null,
    },
  })

  return {
    fileId: fileObject.id,
    path: fileKey,
    url: `/api/files/${fileObject.id}/download`,
  }
}

async function getSupabaseSignedUrl(path: string): Promise<SignedUrlResult> {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'resumes'

  const expiresIn = 3600
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get Supabase signed URL: ${response.status}`)
  }

  const data = await response.json()

  return {
    url: `${supabaseUrl}/storage/v1${data.signedURL}`,
    expiresAt,
  }
}

// ============================================================================
// LOCAL Storage Implementation (stores in database - for development only)
// ============================================================================

async function uploadToLocal(file: File, folder: string): Promise<UploadResult> {
  console.warn('WARNING: Using LOCAL file storage. Files are stored as base64 in the database. This is not recommended for production.')

  const buffer = await file.arrayBuffer()
  const checksum = createHash('sha256').update(Buffer.from(buffer)).digest('hex')
  const path = `${folder}/${Date.now()}-${sanitizeFilename(file.name)}`
  const base64Data = Buffer.from(buffer).toString('base64')

  const fileObject = await prisma.fileObject.create({
    data: {
      provider: 'LOCAL',
      path,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.byteLength,
      checksum,
      data: base64Data,
    },
  })

  return {
    fileId: fileObject.id,
    path: fileObject.path,
    url: `/api/files/${fileObject.id}/download`,
  }
}

async function getLocalSignedUrl(fileId: string): Promise<SignedUrlResult> {
  // For LOCAL storage, generate a time-limited token
  const expiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour
  const token = createHash('sha256')
    .update(`${fileId}:${expiresAt.getTime()}:${process.env.NEXTAUTH_SECRET || 'dev-secret'}`)
    .digest('hex')
    .slice(0, 32)

  return {
    url: `/api/files/${fileId}/download?token=${token}&expires=${expiresAt.getTime()}`,
    expiresAt,
  }
}

/**
 * Verify a LOCAL storage download token
 */
export function verifyLocalDownloadToken(fileId: string, token: string, expires: string): boolean {
  const expiresTime = parseInt(expires, 10)
  if (isNaN(expiresTime) || Date.now() > expiresTime) {
    return false
  }

  const expectedToken = createHash('sha256')
    .update(`${fileId}:${expiresTime}:${process.env.NEXTAUTH_SECRET || 'dev-secret'}`)
    .digest('hex')
    .slice(0, 32)

  return token === expectedToken
}

/**
 * Download file content from cloud storage
 */
export async function downloadFileFromStorage(fileId: string): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  const fileObject = await prisma.fileObject.findUnique({
    where: { id: fileId },
  })

  if (!fileObject) {
    return null
  }

  const provider = fileObject.provider as 'S3' | 'R2' | 'SUPABASE' | 'LOCAL'
  const filename = fileObject.path.split('/').pop() || 'download'

  if (provider === 'LOCAL') {
    if (!fileObject.data) {
      return null
    }
    return {
      buffer: Buffer.from(fileObject.data, 'base64'),
      mimeType: fileObject.mimeType,
      filename,
    }
  }

  // For cloud providers, get signed URL and fetch
  const signedUrl = await getSignedDownloadUrl(fileId)
  if (!signedUrl) {
    return null
  }

  const response = await fetch(signedUrl.url)
  if (!response.ok) {
    throw new Error(`Failed to download from storage: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: fileObject.mimeType,
    filename,
  }
}

// ============================================================================
// Helper functions
// ============================================================================

function hmacSha256(key: string | Buffer, data: string): Buffer {
  const { createHmac } = require('crypto')
  return createHmac('sha256', key).update(data).digest()
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100)
}
