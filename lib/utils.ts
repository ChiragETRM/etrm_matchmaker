import slugify from 'slugify'

export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  }) + '-' + Date.now().toString(36)
}

export function isJobActive(expiresAt: Date): boolean {
  return new Date() < expiresAt
}