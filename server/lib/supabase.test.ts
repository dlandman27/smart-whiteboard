import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('supabaseAdmin', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear module cache so we re-evaluate the module each time
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('exports a Supabase client when env vars are set', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

    const { supabaseAdmin } = await import('./supabase.js')
    expect(supabaseAdmin).toBeDefined()
    expect(typeof supabaseAdmin.from).toBe('function')
  })

  it('throws when env vars are missing', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    await expect(import('./supabase.js')).rejects.toThrow('Missing SUPABASE_URL')
  })
})
