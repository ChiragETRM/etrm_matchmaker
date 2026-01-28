// Cloudflare Turnstile CAPTCHA verification
// https://developers.cloudflare.com/turnstile/

interface TurnstileVerifyResponse {
  success: boolean
  challenge_ts?: string // ISO timestamp of challenge
  hostname?: string // hostname for which token was issued
  'error-codes'?: string[]
  action?: string // widget action
  cdata?: string // custom data
}

interface VerificationResult {
  success: boolean
  error?: string
  timestamp?: string
  hostname?: string
}

/**
 * Verify a Turnstile token server-side
 *
 * @param token - The token from the Turnstile widget (cf-turnstile-response)
 * @param ip - Optional client IP address for additional validation
 * @returns Verification result
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  ip?: string
): Promise<VerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // If no secret key is configured, skip verification in development
  if (!secretKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Turnstile verification skipped: TURNSTILE_SECRET_KEY not configured')
      return { success: true }
    }
    return {
      success: false,
      error: 'CAPTCHA verification is not configured',
    }
  }

  // Token is required
  if (!token) {
    return {
      success: false,
      error: 'CAPTCHA token is required',
    }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)

    if (ip) {
      formData.append('remoteip', ip)
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    )

    if (!response.ok) {
      console.error('Turnstile API error:', response.status, response.statusText)
      return {
        success: false,
        error: 'CAPTCHA verification service unavailable',
      }
    }

    const data: TurnstileVerifyResponse = await response.json()

    if (data.success) {
      return {
        success: true,
        timestamp: data.challenge_ts,
        hostname: data.hostname,
      }
    }

    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'missing-input-secret': 'CAPTCHA configuration error',
      'invalid-input-secret': 'CAPTCHA configuration error',
      'missing-input-response': 'CAPTCHA token is required',
      'invalid-input-response': 'CAPTCHA token is invalid or expired',
      'bad-request': 'CAPTCHA verification failed',
      'timeout-or-duplicate': 'CAPTCHA token has expired. Please try again.',
      'internal-error': 'CAPTCHA verification service error',
    }

    const errorCode = data['error-codes']?.[0] || 'unknown'
    const errorMessage = errorMessages[errorCode] || 'CAPTCHA verification failed'

    console.warn('Turnstile verification failed:', {
      errorCodes: data['error-codes'],
      hostname: data.hostname,
    })

    return {
      success: false,
      error: errorMessage,
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return {
      success: false,
      error: 'CAPTCHA verification failed. Please try again.',
    }
  }
}

/**
 * Check if Turnstile is configured and should be enforced
 */
export function isTurnstileEnabled(): boolean {
  return !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
}
