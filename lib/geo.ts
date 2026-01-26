/**
 * Resolve client IP from request headers (e.g. Vercel, load balancers).
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  const real = request.headers.get('x-real-ip')
  return real ?? null
}

/**
 * Vercel populates geo headers when deployed. Prefer these over IP lookup.
 */
export function getVercelCountry(request: Request): string | null {
  return request.headers.get('x-vercel-ip-country') ?? null
}

const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  US: 'United States',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  CH: 'Switzerland',
  SG: 'Singapore',
  JP: 'Japan',
  AU: 'Australia',
  CA: 'Canada',
}

export function countryCodeToName(code: string): string {
  const n = code.toUpperCase()
  return COUNTRY_CODE_TO_NAME[n] ?? code
}

interface GeoResult {
  countryCode: string
  country: string
}

/**
 * Fetch country from ip-api.com (no key, 45 req/min). Use for non-Vercel or fallback.
 */
export async function geoFromIp(ip: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,countryCode`,
      { signal: AbortSignal.timeout(3000) }
    )
    const data = (await res.json()) as { country?: string; countryCode?: string }
    if (data.countryCode) {
      return {
        countryCode: data.countryCode,
        country: data.country ?? data.countryCode,
      }
    }
  } catch (e) {
    console.warn('Geo lookup failed:', e)
  }
  return null
}
