import * as bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10
const OTP_SALT_ROUNDS = 10

export function generateOtp(): string {
  // Generate 6-digit numeric OTP (000000-999999)
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0')
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, OTP_SALT_ROUNDS)
}

export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(otp, hash)
  } catch {
    return false
  }
}

export function getOtpExpiry(): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + OTP_EXPIRY_MINUTES)
  return d
}

export const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000
