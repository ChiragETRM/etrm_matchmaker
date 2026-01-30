import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  validatePassword,
} from '../password'

describe('password', () => {
  describe('hashPassword and verifyPassword', () => {
    it('hashes and verifies correctly', async () => {
      const password = 'SecurePass1'
      const hash = await hashPassword(password)
      expect(hash).toBeTruthy()
      expect(hash).not.toBe(password)
      const valid = await verifyPassword(password, hash)
      expect(valid).toBe(true)
    })

    it('rejects wrong password', async () => {
      const hash = await hashPassword('SecurePass1')
      const valid = await verifyPassword('WrongPass1', hash)
      expect(valid).toBe(false)
    })

    it('rejects invalid hash', async () => {
      const valid = await verifyPassword('SecurePass1', 'invalidhash')
      expect(valid).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('accepts valid password (10+ chars, upper, lower, number)', () => {
      expect(validatePassword('SecurePass1').valid).toBe(true)
      expect(validatePassword('Abcdefghi1').valid).toBe(true)
    })

    it('rejects too short', () => {
      const r = validatePassword('Abcdefg1')
      expect(r.valid).toBe(false)
      expect(r.errors.some((e) => e.includes('10'))).toBe(true)
    })

    it('rejects no uppercase', () => {
      const r = validatePassword('securepass1')
      expect(r.valid).toBe(false)
      expect(r.errors.some((e) => e.toLowerCase().includes('uppercase'))).toBe(true)
    })

    it('rejects no lowercase', () => {
      const r = validatePassword('SECUREPASS1')
      expect(r.valid).toBe(false)
      expect(r.errors.some((e) => e.toLowerCase().includes('lowercase'))).toBe(true)
    })

    it('rejects no number', () => {
      const r = validatePassword('SecurePassWord')
      expect(r.valid).toBe(false)
      expect(r.errors.some((e) => e.toLowerCase().includes('number'))).toBe(true)
    })
  })
})
