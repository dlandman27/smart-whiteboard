import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

const mockFetch = vi.fn()
global.fetch = mockFetch

import { useScores, useStandings, useNFLScores, useNBAScores } from './useSports'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const RAW_EVENT = {
  id: 'game-1',
  competitions: [{
    status: { type: { state: 'pre', shortDetail: '7:00 PM', detail: '7:00 PM ET' } },
    competitors: [
      {
        homeAway: 'home',
        score: '0',
        team: { abbreviation: 'KC', displayName: 'Kansas City Chiefs', logo: 'kc.png' },
        records: [{ summary: '10-5' }],
      },
      {
        homeAway: 'away',
        score: '0',
        team: { abbreviation: 'BUF', displayName: 'Buffalo Bills', logo: 'buf.png' },
        records: [{ summary: '11-4' }],
      },
    ],
  }],
}

const STANDINGS_DATA = {
  league: 'NFL',
  columns: ['W', 'L'],
  groups: [{ group: 'AFC East', teams: [{ pos: 1, team: 'BUF', name: 'Buffalo Bills', logo: 'buf.png', W: 11, L: 4 }] }],
}

describe('useScores', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns parsed games for a league', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [RAW_EVENT] }),
    })

    const { result } = renderHook(() => useScores('nfl'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    const game = result.current.data![0]
    expect(game.id).toBe('game-1')
    expect(game.status).toBe('pre')
    expect(game.home.abbr).toBe('KC')
    expect(game.away.abbr).toBe('BUF')
  })

  it('returns empty array when events is missing', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    const { result } = renderHook(() => useScores('nba'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('enters error state when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const { result } = renderHook(() => useScores('nfl'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('maps "in" game status correctly', async () => {
    const inProgress = {
      ...RAW_EVENT,
      competitions: [{
        ...RAW_EVENT.competitions[0],
        status: { type: { state: 'in', shortDetail: 'Q2 10:00', detail: 'Q2 10:00' } },
      }],
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ events: [inProgress] }) })
    const { result } = renderHook(() => useScores('nfl'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe('in')
  })

  it('maps "post" game status correctly', async () => {
    const final = {
      ...RAW_EVENT,
      competitions: [{
        ...RAW_EVENT.competitions[0],
        status: { type: { state: 'post', shortDetail: 'Final', detail: 'Final' } },
      }],
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ events: [final] }) })
    const { result } = renderHook(() => useScores('nfl'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].status).toBe('post')
  })
})

describe('useStandings', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns standings data', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => STANDINGS_DATA })
    const { result } = renderHook(() => useStandings('nfl'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.league).toBe('NFL')
    expect(result.current.data?.groups).toHaveLength(1)
  })

  it('enters error state when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })
    const { result } = renderHook(() => useStandings('nfl'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('backwards-compat hooks', () => {
  beforeEach(() => mockFetch.mockReset())

  it('useNFLScores delegates to useScores("nfl")', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ events: [] }) })
    const { result } = renderHook(() => useNFLScores(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockFetch).toHaveBeenCalledWith('/api/sports/nfl')
  })

  it('useNBAScores delegates to useScores("nba")', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ events: [] }) })
    const { result } = renderHook(() => useNBAScores(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockFetch).toHaveBeenCalledWith('/api/sports/nba')
  })
})
