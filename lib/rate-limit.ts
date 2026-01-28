// Production-ready rate limiter
// Uses Redis (Upstash) in production, falls back to in-memory for development
//
// Environment variables:
//   UPSTASH_REDIS_REST_URL - Upstash Redis REST URL
//   UPSTASH_REDIS_REST_TOKEN - Upstash Redis REST token
//   RATE_LIMIT_MAX_REQUESTS - Max requests per window (default: 10)
//   RATE_LIMIT_WINDOW_MS - Window size in ms (default: 60000)

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

interface RateLimitConfig {
  maxRequests?: number
  windowMs?: number
}

const DEFAULT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10)
const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)

// In-memory fallback store (development only)
const memoryStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Check rate limit for an identifier
 * Uses Redis in production, in-memory for development
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS

  // Try Redis first
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    return checkRateLimitRedis(identifier, maxRequests, windowMs, redisUrl, redisToken)
  }

  // Fall back to in-memory (development only)
  if (process.env.NODE_ENV === 'production') {
    console.warn('WARNING: Using in-memory rate limiting in production. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed rate limiting.')
  }

  return checkRateLimitMemory(identifier, maxRequests, windowMs)
}

/**
 * Synchronous rate limit check (legacy compatibility)
 * Prefer async checkRateLimit() for new code
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS
  return checkRateLimitMemory(identifier, maxRequests, windowMs)
}

/**
 * Redis-based rate limiting using Upstash REST API
 * Uses sliding window algorithm
 */
async function checkRateLimitRedis(
  identifier: string,
  maxRequests: number,
  windowMs: number,
  redisUrl: string,
  redisToken: string
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`
  const now = Date.now()
  const windowStart = now - windowMs

  try {
    // Use Redis pipeline for atomic operations
    // 1. Remove old entries outside the window
    // 2. Add current request timestamp
    // 3. Count requests in window
    // 4. Set TTL
    const pipeline = [
      ['ZREMRANGEBYSCORE', key, '0', windowStart.toString()],
      ['ZADD', key, now.toString(), `${now}:${Math.random()}`],
      ['ZCARD', key],
      ['PEXPIRE', key, windowMs.toString()],
    ]

    const response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    })

    if (!response.ok) {
      console.error('Redis rate limit error:', response.status, await response.text())
      // Fall back to allowing the request on Redis error
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
        limit: maxRequests,
      }
    }

    const results = await response.json()
    const count = results[2]?.result ?? 0

    const allowed = count <= maxRequests
    const remaining = Math.max(0, maxRequests - count)
    const resetAt = now + windowMs

    return {
      allowed,
      remaining,
      resetAt,
      limit: maxRequests,
    }
  } catch (error) {
    console.error('Redis rate limit error:', error)
    // Fall back to allowing the request on error
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
      limit: maxRequests,
    }
  }
}

/**
 * In-memory rate limiting (development/fallback)
 */
function checkRateLimitMemory(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowMs
    memoryStore.set(identifier, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
      limit: maxRequests,
    }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: maxRequests,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
    limit: maxRequests,
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Application submission - strict to prevent spam
  submit: { maxRequests: 5, windowMs: 60000 }, // 5 per minute

  // One-click apply - moderate
  oneClickApply: { maxRequests: 10, windowMs: 60000 }, // 10 per minute

  // File upload - moderate
  fileUpload: { maxRequests: 20, windowMs: 60000 }, // 20 per minute

  // API general - lenient
  apiGeneral: { maxRequests: 100, windowMs: 60000 }, // 100 per minute

  // Auth endpoints - strict to prevent brute force
  auth: { maxRequests: 10, windowMs: 300000 }, // 10 per 5 minutes

  // Public job listing - lenient
  publicJobs: { maxRequests: 60, windowMs: 60000 }, // 60 per minute
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check various headers in order of preference
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    // Take the first IP in the chain (client IP)
    return xff.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  return 'unknown'
}

// Cleanup old entries periodically (in-memory only)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    memoryStore.forEach((entry, key) => {
      if (now > entry.resetAt) {
        memoryStore.delete(key)
      }
    })
  }, DEFAULT_WINDOW_MS)
}
