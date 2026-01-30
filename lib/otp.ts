import * as argon2 from 'argon2'
import { randomInt } from 'crypto'

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10

export function generateOtp(): string {
  // Generate 6-digit numeric OTP (000000-999999)
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0')
}

export async function hashOtp(otp: string): Promise<string> {
  return argon2.hash(otp, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 2,
  })
}

export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, otp)
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
