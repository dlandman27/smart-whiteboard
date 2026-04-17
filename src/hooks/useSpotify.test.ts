import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useSpotifyStatus, useInvalidateSpotifyStatus, startSpotifyAuth } from './useSpotify'

const mockFetch = vi.fn()

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children),
    qc,
  }
}

describe('useSpotifyStatus', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns connected: true when API responds successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: true }),
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSpotifyStatus(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ connected: true })
  })

  it('returns connected: false when API says not connected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSpotifyStatus(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.connected).toBe(false)
  })

  it('enters error state when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSpotifyStatus(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useInvalidateSpotifyStatus', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  it('returns a function', () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ connected: false }) })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useInvalidateSpotifyStatus(), { wrapper })
    expect(typeof result.current).toBe('function')
  })

  it('calling it does not throw', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ connected: false }) })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useInvalidateSpotifyStatus(), { wrapper })
    await expect(act(() => result.current())).resolves.not.toThrow()
  })
})

describe('startSpotifyAuth', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  it('returns the auth URL from the API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://accounts.spotify.com/authorize?...' }),
    })

    const url = await startSpotifyAuth('client-id', 'client-secret', 'http://localhost/callback')
    expect(url).toBe('https://accounts.spotify.com/authorize?...')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/spotify/start-auth',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ clientId: 'client-id', clientSecret: 'client-secret', redirectUri: 'http://localhost/callback' }),
      })
    )
  })

  it('throws when the API returns an error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 })

    await expect(
      startSpotifyAuth('id', 'secret', 'http://localhost')
    ).rejects.toThrow('Failed to start auth')
  })
})
