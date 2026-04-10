import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { randomBytes } from 'crypto'

const TEST_KEY = randomBytes(32).toString('hex')

// Set encryption key before any imports
beforeAll(() => { process.env.ENCRYPTION_KEY = TEST_KEY })
afterAll(() => { delete process.env.ENCRYPTION_KEY })

// Mock supabaseAdmin
const mockChain = () => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
  }
  return chain
}

const oauthChain = mockChain()
const credChain = mockChain()

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'oauth_tokens') return oauthChain
      if (table === 'user_credentials') return credChain
      return mockChain()
    }),
  },
}))

import { loadOAuthTokens, saveOAuthTokens, deleteOAuthTokens, loadCredential, saveCredential } from './credentials.js'
import { encrypt } from '../lib/crypto.js'

beforeEach(() => {
  vi.clearAllMocks()
  // Re-set defaults
  oauthChain.single.mockResolvedValue({ data: null, error: null })
  credChain.single.mockResolvedValue({ data: null, error: null })
})

describe('OAuth tokens', () => {
  it('saveOAuthTokens encrypts access_token and refresh_token', async () => {
    await saveOAuthTokens('u1', 'gcal', {
      access_token: 'my-access-token',
      refresh_token: 'my-refresh-token',
    })
    const call = oauthChain.upsert.mock.calls[0][0]
    expect(call.access_token).not.toBe('my-access-token')
    expect(call.refresh_token).not.toBe('my-refresh-token')
    expect(call.user_id).toBe('u1')
    expect(call.service).toBe('gcal')
  })

  it('loadOAuthTokens decrypts tokens', async () => {
    oauthChain.single.mockResolvedValue({
      data: {
        user_id: 'u1', service: 'gcal',
        access_token: encrypt('decrypted-access'),
        refresh_token: encrypt('decrypted-refresh'),
        expires_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    })

    const tokens = await loadOAuthTokens('u1', 'gcal')
    expect(tokens?.access_token).toBe('decrypted-access')
    expect(tokens?.refresh_token).toBe('decrypted-refresh')
  })

  it('loadOAuthTokens returns null when no tokens exist', async () => {
    oauthChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const tokens = await loadOAuthTokens('u1', 'gcal')
    expect(tokens).toBeNull()
  })

  it('deleteOAuthTokens calls delete with correct filters', async () => {
    await deleteOAuthTokens('u1', 'gcal')
    expect(oauthChain.delete).toHaveBeenCalled()
  })
})

describe('User credentials', () => {
  it('saveCredential encrypts api_key and client_secret', async () => {
    await saveCredential('u1', 'notion', {
      api_key: 'secret_key_123',
      client_id: 'public-id',
      client_secret: 'secret_456',
    })
    const call = credChain.upsert.mock.calls[0][0]
    expect(call.api_key).not.toBe('secret_key_123')
    expect(call.client_id).toBe('public-id') // not encrypted
    expect(call.client_secret).not.toBe('secret_456')
  })

  it('loadCredential decrypts sensitive fields', async () => {
    credChain.single.mockResolvedValue({
      data: {
        user_id: 'u1', service: 'notion',
        api_key: encrypt('my-api-key'),
        client_id: 'public-id',
        client_secret: encrypt('my-secret'),
        redirect_uri: 'http://localhost:3001/callback',
      },
      error: null,
    })

    const cred = await loadCredential('u1', 'notion')
    expect(cred?.api_key).toBe('my-api-key')
    expect(cred?.client_id).toBe('public-id')
    expect(cred?.client_secret).toBe('my-secret')
    expect(cred?.redirect_uri).toBe('http://localhost:3001/callback')
  })
})
