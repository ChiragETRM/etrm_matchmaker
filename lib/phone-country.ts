export const PHONE_COUNTRIES: { code: string; dialCode: string; flag: string; name: string }[] = [
  { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'CA', dialCode: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: 'GB', dialCode: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AU', dialCode: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: 'IN', dialCode: '+91', flag: '🇮🇳', name: 'India' },
  { code: 'DE', dialCode: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', dialCode: '+33', flag: '🇫🇷', name: 'France' },
  { code: 'IE', dialCode: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: 'NL', dialCode: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: 'IT', dialCode: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: 'SG', dialCode: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: 'NZ', dialCode: '+64', flag: '🇳🇿', name: 'New Zealand' },
  { code: 'JP', dialCode: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: 'BR', dialCode: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: 'ZA', dialCode: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: 'PK', dialCode: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: 'PH', dialCode: '+63', flag: '🇵🇭', name: 'Philippines' },
  { code: 'PL', dialCode: '+48', flag: '🇵🇱', name: 'Poland' },
  { code: 'OTHER', dialCode: '', flag: '🌐', name: 'Other' },
]

export function parsePhone(phone: string | null | undefined): { countryCode: string; national: string } {
  if (!phone || typeof phone !== 'string') return { countryCode: 'US', national: '' }
  const trimmed = phone.trim().replace(/\s+/g, ' ')
  const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed}`
  const digitsOnly = withPlus.replace(/\D/g, '')
  if (!digitsOnly) return { countryCode: 'US', national: '' }
  const sorted = [...PHONE_COUNTRIES].filter(c => c.dialCode).sort((a, b) => b.dialCode.length - a.dialCode.length)
  for (const c of sorted) {
    const codeDigits = c.dialCode.replace(/\D/g, '')
    if (digitsOnly.startsWith(codeDigits)) {
      const national = digitsOnly.slice(codeDigits.length).replace(/(\d{3})(?=\d)/g, '$1 ').trim()
      return { countryCode: c.code, national }
    }
  }
  return { countryCode: 'OTHER', national: trimmed }
}

export function formatPhone(countryCode: string, national: string): string {
  const country = PHONE_COUNTRIES.find(c => c.code === countryCode)
  const dial = country?.dialCode || ''
  const trimmed = national.trim()
  if (!trimmed) return ''
  if (countryCode === 'OTHER') return trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/\D/g, '')}`
  const digits = national.replace(/\D/g, '')
  if (!digits) return ''
  return `${dial} ${digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()}`
}
