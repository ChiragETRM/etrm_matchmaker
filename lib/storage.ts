// File storage abstraction
// Supports S3, R2, or Supabase Storage

interface UploadResult {
  fileId: string
  path: string
  url: string
}

export async function uploadFile(
  file: File,
  folder: string = 'resumes'
): Promise<UploadResult> {
  const provider = process.env.STORAGE_PROVIDER || 'SUPABASE'

  if (provider === 'S3') {
    return uploadToS3(file, folder)
  } else if (provider === 'R2') {
    return uploadToR2(file, folder)
  } else {
    return uploadToSupabase(file, folder)
  }
}

export async function getFileUrl(fileId: string): Promise<string> {
  // In production, fetch from DB and generate signed URL
  // For MVP, return a placeholder
  return `/api/files/${fileId}`
}

async function uploadToS3(file: File, folder: string): Promise<UploadResult> {
  // TODO: Implement S3 upload
  throw new Error('S3 upload not implemented')
}

async function uploadToR2(file: File, folder: string): Promise<UploadResult> {
  // TODO: Implement R2 upload
  throw new Error('R2 upload not implemented')
}

async function uploadToSupabase(
  file: File,
  folder: string
): Promise<UploadResult> {
  // TODO: Implement Supabase Storage upload
  // For MVP, we'll use a simple approach
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('File upload failed')
  }

  return response.json()
}