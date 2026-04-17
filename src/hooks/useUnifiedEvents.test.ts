import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { UnifiedEvent } from '../types/unified'

// Mock the providers module
vi.mock('../providers', () => ({
  getEventProviders: vi.fn(),
}))

import { getEventProviders } from '../providers'
import { useUnifiedEvents, useEventGroups } from './useUnifiedEvents'

const mockGetEventProviders = vi.mocked(getEventProviders)

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const gcalEvent: UnifiedEvent = {
  source: { provider: 'gcal', id: 'evt-1', calendarId: 'primary' },
  title: 'Team Standup',
  start: '2025-04-17T09:00:00Z',
  end: '2025-04-17T09:30:00Z',
  allDay: false,
  groupName: 'Work',
}

const icalEvent: UnifiedEvent = {
  source: { provider: 'ical', id: 'evt-2', feedUrl: 'https://example.com/feed.ics' },
  title: 'Holiday',
  start: '2025-04-18T00:00:00Z',
  allDay: true,
  groupName: 'Holidays',
}

describe('useUnifiedEvents', () => {
  beforeEach(() => {
    mockGetEventProviders.mockReset()
  })

  it('returns combined events from all providers on success', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn().mockResolvedValue([gcalEvent]),
      },
      {
        id: 'ical',
        label: 'iCal',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn().mockResolvedValue([icalEvent]),
      },
    ] as any)

    const { result } = renderHook(
      () => useUnifiedEvents('2025-04-17T00:00:00Z', '2025-04-24T00:00:00Z'),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data).toContainEqual(gcalEvent)
    expect(result.current.data).toContainEqual(icalEvent)
  })

  it('returns only events from successful providers when one provider fails', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn().mockResolvedValue([gcalEvent]),
      },
      {
        id: 'ical',
        label: 'iCal',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn().mockRejectedValue(new Error('Feed unavailable')),
      },
    ] as any)

    const { result } = renderHook(
      () => useUnifiedEvents('2025-04-17T00:00:00Z', '2025-04-24T00:00:00Z'),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]).toEqual(gcalEvent)
  })

  it('returns empty array when all providers fail', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn().mockRejectedValue(new Error('Auth error')),
      },
    ] as any)

    const { result } = renderHook(
      () => useUnifiedEvents('2025-04-17T00:00:00Z', '2025-04-24T00:00:00Z'),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })

  it('does not fetch when timeMin or timeMax is empty', async () => {
    const mockFetchEvents = vi.fn()
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: mockFetchEvents,
      },
    ] as any)

    const { result } = renderHook(
      () => useUnifiedEvents('', '2025-04-24T00:00:00Z'),
      { wrapper: makeWrapper() },
    )

    await new Promise(r => setTimeout(r, 50))
    expect(result.current.isFetching).toBe(false)
    expect(mockFetchEvents).not.toHaveBeenCalled()
  })

  it('filters events by visibleGroups when provided', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn().mockResolvedValue([gcalEvent, icalEvent]),
      },
    ] as any)

    const visibleGroups = new Set(['gcal:Work'])

    const { result } = renderHook(
      () => useUnifiedEvents('2025-04-17T00:00:00Z', '2025-04-24T00:00:00Z', visibleGroups),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].title).toBe('Team Standup')
  })

  it('returns all events when visibleGroups is empty set', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn().mockResolvedValue([gcalEvent, icalEvent]),
      },
    ] as any)

    const { result } = renderHook(
      () => useUnifiedEvents('2025-04-17T00:00:00Z', '2025-04-24T00:00:00Z', new Set()),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })

  it('is in pending state while providers are loading', async () => {
    let resolveEvents!: (v: UnifiedEvent[]) => void
    const pendingPromise = new Promise<UnifiedEvent[]>(res => { resolveEvents = res })

    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn().mockReturnValue(pendingPromise),
      },
    ] as any)

    const { result } = renderHook(
      () => useUnifiedEvents('2025-04-17T00:00:00Z', '2025-04-24T00:00:00Z'),
      { wrapper: makeWrapper() },
    )

    // Should be in loading/pending state
    expect(result.current.isSuccess).toBe(false)

    // Cleanup
    resolveEvents([])
  })
})

describe('useEventGroups', () => {
  beforeEach(() => {
    mockGetEventProviders.mockReset()
  })

  it('returns annotated groups from all providers', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: 'gcal-icon',
        isConnected: () => true,
        fetchGroups: vi.fn().mockResolvedValue([
          { groupName: 'Work', provider: 'gcal', color: '#4285f4' },
        ]),
        fetchEvents: vi.fn(),
      },
    ] as any)

    const { result } = renderHook(() => useEventGroups(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]).toMatchObject({
      groupName: 'Work',
      key: 'gcal:Work',
      providerId: 'gcal',
      providerLabel: 'Google Calendar',
      providerIcon: 'gcal-icon',
    })
  })

  it('returns empty array when all providers fail to fetch groups', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn().mockRejectedValue(new Error('Unauthorized')),
        fetchEvents: vi.fn(),
      },
    ] as any)

    const { result } = renderHook(() => useEventGroups(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })
})
