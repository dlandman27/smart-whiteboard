import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing apiFetch
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

import { apiFetch } from './apiFetch'
import { supabase } from './supabase'

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.restoreAllMocks()
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-jwt-token' } },
  })
})

describe('apiFetch', () => {
  it('attaches Bearer token from Supabase session', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    await apiFetch('/api/test')

    const [, options] = spy.mock.calls[0]
    const headers = new Headers(options?.headers)
    expect(headers.get('Authorization')).toBe('Bearer test-jwt-token')
  })

  it('omits Authorization header when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    await apiFetch('/api/test')

    const [, options] = spy.mock.calls[0]
    const headers = new Headers(options?.headers)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('throws with error message on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
    )

    await expect(apiFetch('/api/missing')).rejects.toThrow('Not found')
  })

  it('throws with HTTP status when error JSON is unparseable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad gateway', { status: 502, headers: { 'Content-Type': 'text/plain' } }),
    )

    await expect(apiFetch('/api/broken')).rejects.toThrow('HTTP 502')
  })
})
