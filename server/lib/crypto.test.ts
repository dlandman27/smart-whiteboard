import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomBytes } from 'crypto'

const TEST_KEY = randomBytes(32).toString('hex')

describe('crypto', () => {
  const originalKey = process.env.ENCRYPTION_KEY

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY
  })

  afterAll(() => {
    if (originalKey) process.env.ENCRYPTION_KEY = originalKey
    else delete process.env.ENCRYPTION_KEY
  })

  it('encrypt then decrypt returns original string', async () => {
    const { encrypt, decrypt } = await import('./crypto.js')
    const plaintext = 'my-secret-api-key-12345'
    const encrypted = encrypt(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })

  it('different plaintexts produce different ciphertexts', async () => {
    const { encrypt } = await import('./crypto.js')
    const a = encrypt('hello')
    const b = encrypt('world')
    expect(a).not.toBe(b)
  })

  it('same plaintext produces different ciphertexts (random IV)', async () => {
    const { encrypt } = await import('./crypto.js')
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
  })

  it('decrypt with corrupted ciphertext throws', async () => {
    const { encrypt, decrypt } = await import('./crypto.js')
    const encrypted = encrypt('test')
    const corrupted = encrypted.slice(0, -4) + 'AAAA'
    expect(() => decrypt(corrupted)).toThrow()
  })
})
