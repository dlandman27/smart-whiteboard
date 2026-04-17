import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock: credentials ────────────────────────────────────────────────────────
vi.mock('./credentials.js', () => ({
  loadOAuthTokens: vi.fn(),
  saveOAuthTokens: vi.fn(),
  loadCredential:  vi.fn(),
}))

import { loadOAuthTokens, saveOAuthTokens, loadCredential } from './credentials.js'
import { getSpotifyAccessToken, spotifyControl } from './spotify.js'

const mockLoadTokens = loadOAuthTokens as ReturnType<typeof vi.fn>
const mockSaveTokens = saveOAuthTokens as ReturnType<typeof vi.fn>
const mockLoadCred   = loadCredential  as ReturnType<typeof vi.fn>

// Valid credentials used across tests
const CRED    = { client_id: 'cid', client_secret: 'csec' }
const TOKENS  = {
  access_token:  'acc-tok',
  refresh_token: 'ref-tok',
  expires_at:    new Date(Date.now() + 3_600_000).toISOString(), // 1 h from now
}
const EXPIRED_TOKENS = {
  access_token:  'old-acc',
  refresh_token: 'old-ref',
  expires_at:    new Date(Date.now() - 10_000).toISOString(), // in the past
}

// Helper: build a mock Response
function mockResponse(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    json:    vi.fn().mockResolvedValue(body),
    text:    vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(global, 'fetch').mockReset()
})

// ──────────────────────────────────────────────────────────────────────────────
describe('getSpotifyAccessToken', () => {
  it('returns null when tokens are missing', async () => {
    mockLoadTokens.mockResolvedValue(null)
    mockLoadCred.mockResolvedValue(CRED)
    expect(await getSpotifyAccessToken('u1')).toBeNull()
  })

  it('returns null when credentials are missing', async () => {
    mockLoadTokens.mockResolvedValue(TOKENS)
    mockLoadCred.mockResolvedValue(null)
    expect(await getSpotifyAccessToken('u1')).toBeNull()
  })

  it('returns existing access_token when it is still valid', async () => {
    mockLoadTokens.mockResolvedValue(TOKENS)
    mockLoadCred.mockResolvedValue(CRED)
    const token = await getSpotifyAccessToken('u1')
    expect(token).toBe('acc-tok')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('refreshes and saves a new token when the current one has expired', async () => {
    mockLoadTokens.mockResolvedValue(EXPIRED_TOKENS)
    mockLoadCred.mockResolvedValue(CRED)

    const refreshResp = mockResponse(200, {
      access_token: 'new-acc',
      expires_in:   3600,
    })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(refreshResp as any)

    const token = await getSpotifyAccessToken('u1')

    expect(token).toBe('new-acc')
    expect(mockSaveTokens).toHaveBeenCalledWith(
      'u1',
      'spotify',
      expect.objectContaining({ access_token: 'new-acc', refresh_token: 'old-ref' }),
    )
  })

  it('returns null when the refresh call does not return an access_token', async () => {
    mockLoadTokens.mockResolvedValue(EXPIRED_TOKENS)
    mockLoadCred.mockResolvedValue(CRED)

    const refreshResp = mockResponse(400, { error: 'invalid_grant' })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(refreshResp as any)

    expect(await getSpotifyAccessToken('u1')).toBeNull()
  })

  it('uses the refreshed refresh_token if the response includes one', async () => {
    mockLoadTokens.mockResolvedValue(EXPIRED_TOKENS)
    mockLoadCred.mockResolvedValue(CRED)

    const refreshResp = mockResponse(200, {
      access_token:  'new-acc',
      refresh_token: 'new-ref',
      expires_in:    3600,
    })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(refreshResp as any)

    await getSpotifyAccessToken('u1')

    expect(mockSaveTokens).toHaveBeenCalledWith(
      'u1',
      'spotify',
      expect.objectContaining({ refresh_token: 'new-ref' }),
    )
  })
})

// ──────────────────────────────────────────────────────────────────────────────
describe('spotifyControl', () => {
  beforeEach(() => {
    // Default: valid token available
    mockLoadTokens.mockResolvedValue(TOKENS)
    mockLoadCred.mockResolvedValue(CRED)
  })

  it('returns { ok: false } when not authenticated', async () => {
    mockLoadTokens.mockResolvedValue(null)
    const result = await spotifyControl('u1', 'PUT', '/play')
    expect(result).toEqual({ ok: false, error: 'Not authenticated' })
  })

  it('returns { ok: true } on 204 No Content', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(204, '') as any,
    )
    const result = await spotifyControl('u1', 'PUT', '/play')
    expect(result.ok).toBe(true)
  })

  it('returns { ok: true } on 200 OK', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(200, { is_playing: false }) as any,
    )
    const result = await spotifyControl('u1', 'GET', '')
    expect(result.ok).toBe(true)
  })

  it('returns { ok: false } with error message on 403', async () => {
    const resp = mockResponse(403, 'Player command failed: Premium required')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(resp as any)
    const result = await spotifyControl('u1', 'PUT', '/next')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('403')
  })

  it('returns { ok: false } with error message on 401', async () => {
    const resp = mockResponse(401, 'Unauthorized')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(resp as any)
    const result = await spotifyControl('u1', 'PUT', '/previous')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('401')
  })

  it('sends a JSON body when body is provided', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(204, '') as any,
    )
    await spotifyControl('u1', 'PUT', '/volume?volume_percent=50', { volume_percent: 50 })
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ volume_percent: 50 }))
  })

  it('does NOT set Content-Type when no body is provided', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(204, '') as any,
    )
    await spotifyControl('u1', 'POST', '/next')
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('calls the correct Spotify endpoint', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(204, '') as any,
    )
    await spotifyControl('u1', 'POST', '/next')
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://api.spotify.com/v1/me/player/next')
  })
})
