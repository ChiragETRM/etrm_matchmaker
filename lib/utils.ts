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

/** Returns e.g. "5 days left to apply", "Last day to apply", "Expired" */
export function daysLeftToApply(expiresAt: Date | string): string {
  const exp = new Date(expiresAt)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  exp.setHours(0, 0, 0, 0)
  const diffMs = exp.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Last day to apply'
  if (diffDays === 1) return '1 day left to apply'
  return `${diffDays} days left to apply`
}