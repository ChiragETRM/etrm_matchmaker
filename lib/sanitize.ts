// HTML sanitization utilities for XSS prevention
// Lightweight implementation without external dependencies

/**
 * HTML entities that need to be escaped
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape HTML special characters to prevent XSS
 * Use this for user-provided content that will be rendered in HTML
 */
export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return ''
  return String(str).replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Sanitize user input for safe storage
 * Removes potentially dangerous characters and trims whitespace
 */
export function sanitizeInput(str: string | null | undefined): string {
  if (str == null) return ''
  return String(str)
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

/**
 * Sanitize email address
 * Validates format and normalizes
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (email == null) return ''
  const sanitized = String(email).trim().toLowerCase()
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(sanitized) ? sanitized : ''
}

/**
 * Sanitize URL
 * Only allows http, https, and mailto protocols
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (url == null) return ''
  const trimmed = String(url).trim()

  // Empty URL is valid (optional field)
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    // Only allow safe protocols
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return ''
    }
    return parsed.href
  } catch {
    // If it doesn't start with protocol, try adding https://
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('mailto:')) {
      try {
        const withProtocol = new URL(`https://${trimmed}`)
        return withProtocol.href
      } catch {
        return ''
      }
    }
    return ''
  }
}

/**
 * Sanitize phone number
 * Keeps only digits, +, -, (, ), and spaces
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (phone == null) return ''
  return String(phone)
    .trim()
    .replace(/[^\d+\-() ]/g, '')
    .slice(0, 30) // Reasonable max length for phone numbers
}

/**
 * Sanitize a name field
 * Allows letters, spaces, hyphens, apostrophes, and periods
 */
export function sanitizeName(name: string | null | undefined): string {
  if (name == null) return ''
  return String(name)
    .trim()
    // Allow common name characters (letters, accented chars, spaces, hyphens, apostrophes, periods)
    // This simplified regex works with ES5 target
    .replace(/[<>"/\\`=;{}[\]]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 200) // Reasonable max length
}

/**
 * Sanitize JSON for storage
 * Ensures valid JSON and removes potential XSS vectors
 */
export function sanitizeJsonString(json: string | null | undefined): string {
  if (json == null) return '{}'
  try {
    const parsed = JSON.parse(json)
    return JSON.stringify(sanitizeJsonValue(parsed))
  } catch {
    return '{}'
  }
}

/**
 * Recursively sanitize JSON values
 */
function sanitizeJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    return sanitizeInput(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue)
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      // Sanitize keys too
      const sanitizedKey = sanitizeInput(key).slice(0, 100)
      sanitized[sanitizedKey] = sanitizeJsonValue(val)
    }
    return sanitized
  }

  return null
}

/**
 * Build safe HTML email content
 * Escapes all user-provided values
 */
export function buildSafeEmailHtml(template: string, values: Record<string, string | number | boolean | null | undefined>): string {
  let result = template
  for (const [key, value] of Object.entries(values)) {
    const safeValue = escapeHtml(String(value ?? ''))
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safeValue)
  }
  return result
}

/**
 * Validate and sanitize a LinkedIn URL
 */
export function sanitizeLinkedInUrl(url: string | null | undefined): string {
  if (url == null || !url.trim()) return ''

  const sanitizedUrl = sanitizeUrl(url)
  if (!sanitizedUrl) return ''

  try {
    const parsed = new URL(sanitizedUrl)
    // Must be a LinkedIn URL
    if (!parsed.hostname.includes('linkedin.com')) {
      return ''
    }
    return sanitizedUrl
  } catch {
    return ''
  }
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (filename == null) return 'file'
  return String(filename)
    .trim()
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Keep only safe characters
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 255)
    || 'file'
}
