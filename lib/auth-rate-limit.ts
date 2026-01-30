// Auth-specific rate limiting for OTP and login attempts
// Per IP + per email limits

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// OTP request: 5 per 15 min per IP, 3 per 15 min per email
const OTP_IP_MAX = 5
const OTP_IP_WINDOW_MS = 15 * 60 * 1000
const OTP_EMAIL_MAX = 3
const OTP_EMAIL_WINDOW_MS = 15 * 60 * 1000

// Resend OTP: 3 per hour per email, 3 per hour per IP
const RESEND_MAX = 3
const RESEND_WINDOW_MS = 60 * 60 * 1000
const RESEND_IP_MAX = 3
const RESEND_IP_WINDOW_MS = 60 * 60 * 1000

// OTP verify: 10 attempts per 15 min per IP
const VERIFY_IP_MAX = 10
const VERIFY_IP_WINDOW_MS = 15 * 60 * 1000

// Password login: 5 per 15 min per IP
const LOGIN_IP_MAX = 5
const LOGIN_IP_WINDOW_MS = 15 * 60 * 1000

export function checkOtpRequestLimit(ip: string, email: string): {
  allowed: boolean
  retryAfterSeconds?: number
} {
  const ipKey = `otp:ip:${ip}`
  const emailKey = `otp:email:${email.toLowerCase()}`
  const ipOk = checkLimit(ipKey, OTP_IP_MAX, OTP_IP_WINDOW_MS)
  const emailOk = checkLimit(emailKey, OTP_EMAIL_MAX, OTP_EMAIL_WINDOW_MS)
  if (ipOk && emailOk) return { allowed: true }
  const entry = store.get(ipKey) || store.get(emailKey)
  return {
    allowed: false,
    retryAfterSeconds: entry ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 900,
  }
}

function checkLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) return false
  entry.count++
  return true
}

export function checkResendLimit(ip: string, email: string): {
  allowed: boolean
  retryAfterSeconds?: number
} {
  const emailKey = `resend:email:${email.toLowerCase()}`
  const ipKey = `resend:ip:${ip}`
  const now = Date.now()

  const emailEntry = store.get(emailKey)
  if (emailEntry && now <= emailEntry.resetAt && emailEntry.count >= RESEND_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((emailEntry.resetAt - now) / 1000),
    }
  }
  const ipEntry = store.get(ipKey)
  if (ipEntry && now <= ipEntry.resetAt && ipEntry.count >= RESEND_IP_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((ipEntry.resetAt - now) / 1000),
    }
  }

  if (!emailEntry || now > emailEntry.resetAt) {
    store.set(emailKey, { count: 1, resetAt: now + RESEND_WINDOW_MS })
  } else {
    emailEntry.count++
  }
  if (!ipEntry || now > ipEntry.resetAt) {
    store.set(ipKey, { count: 1, resetAt: now + RESEND_IP_WINDOW_MS })
  } else {
    ipEntry.count++
  }
  return { allowed: true }
}

export function checkOtpVerifyLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const key = `verify:ip:${ip}`
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + VERIFY_IP_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= VERIFY_IP_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
  entry.count++
  return { allowed: true }
}

export function checkLoginLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const key = `login:ip:${ip}`
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + LOGIN_IP_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= LOGIN_IP_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
  entry.count++
  return { allowed: true }
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key)
    })
  }, 5 * 60 * 1000)
}
