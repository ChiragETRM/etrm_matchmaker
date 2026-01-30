import * as bcrypt from 'bcryptjs'

const PASSWORD_SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

// Password rules: min 10 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_MIN_LENGTH = 10
const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
}

export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  }
  if (!PASSWORD_REGEX.uppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!PASSWORD_REGEX.lowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!PASSWORD_REGEX.number.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
