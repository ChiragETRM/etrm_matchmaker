import { describe, it, expect } from 'vitest'
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  getOtpExpiry,
  OTP_EXPIRY_MS,
} from '../otp'

describe('otp', () => {
  describe('generateOtp', () => {
    it('returns a 6-digit string', () => {
      const otp = generateOtp()
      expect(otp).toMatch(/^\d{6}$/)
      expect(otp.length).toBe(6)
    })

    it('returns different values on multiple calls', () => {
      const set = new Set<string>()
      for (let i = 0; i < 50; i++) set.add(generateOtp())
      expect(set.size).toBeGreaterThan(1)
    })
  })

  describe('hashOtp and verifyOtpHash', () => {
    it('hashes and verifies correctly', async () => {
      const otp = '123456'
      const hash = await hashOtp(otp)
      expect(hash).toBeTruthy()
      expect(hash).not.toBe(otp)
      const valid = await verifyOtpHash(otp, hash)
      expect(valid).toBe(true)
    })

    it('rejects wrong OTP', async () => {
      const hash = await hashOtp('123456')
      const valid = await verifyOtpHash('654321', hash)
      expect(valid).toBe(false)
    })

    it('rejects wrong hash', async () => {
      const valid = await verifyOtpHash('123456', '$2a$10$invalidhash')
      expect(valid).toBe(false)
    })
  })

  describe('getOtpExpiry', () => {
    it('returns a date ~10 minutes in future', () => {
      const before = Date.now()
      const expiry = getOtpExpiry()
      const after = Date.now()
      const diff = expiry.getTime() - before
      expect(diff).toBeGreaterThanOrEqual(9 * 60 * 1000)
      expect(diff).toBeLessThanOrEqual(11 * 60 * 1000)
    })
  })

  describe('OTP_EXPIRY_MS', () => {
    it('is 10 minutes in ms', () => {
      expect(OTP_EXPIRY_MS).toBe(10 * 60 * 1000)
    })
  })
})
