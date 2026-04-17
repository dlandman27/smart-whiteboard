import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUnifiedEvent, deleteUnifiedEvent } from './useEventMutations'
import type { UnifiedEvent } from '../types/unified'

// Mock the providers module
vi.mock('../providers', () => ({
  getEventProviders: vi.fn(),
}))

import { getEventProviders } from '../providers'

const mockGetEventProviders = vi.mocked(getEventProviders)

describe('createUnifiedEvent', () => {
  beforeEach(() => {
    mockGetEventProviders.mockReset()
  })

  it('calls createEvent on the matching provider', async () => {
    const mockCreateEvent = vi.fn().mockResolvedValue(undefined)
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn(),
        createEvent: mockCreateEvent,
      },
    ] as any)

    const event = {
      title: 'Team Standup',
      start: '2025-04-17T09:00:00Z',
      end: '2025-04-17T09:30:00Z',
      allDay: false,
    }

    await createUnifiedEvent('gcal', 'calendar-1', event)
    expect(mockCreateEvent).toHaveBeenCalledWith('calendar-1', event)
  })

  it('throws when provider is not found', async () => {
    mockGetEventProviders.mockReturnValue([])

    await expect(
      createUnifiedEvent('nonexistent', 'cal-1', {
        title: 'Test',
        start: '2025-04-17T09:00:00Z',
      }),
    ).rejects.toThrow('Provider "nonexistent" does not support creating events')
  })

  it('throws when provider does not support createEvent', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'ical',
        label: 'iCal',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn(),
        // no createEvent
      },
    ] as any)

    await expect(
      createUnifiedEvent('ical', 'feed-1', {
        title: 'Test',
        start: '2025-04-17T09:00:00Z',
      }),
    ).rejects.toThrow('Provider "ical" does not support creating events')
  })

  it('propagates errors from the provider createEvent call', async () => {
    const mockCreateEvent = vi.fn().mockRejectedValue(new Error('API error'))
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn(),
        createEvent: mockCreateEvent,
      },
    ] as any)

    await expect(
      createUnifiedEvent('gcal', 'calendar-1', {
        title: 'Broken',
        start: '2025-04-17T09:00:00Z',
      }),
    ).rejects.toThrow('API error')
  })
})

describe('deleteUnifiedEvent', () => {
  beforeEach(() => {
    mockGetEventProviders.mockReset()
  })

  const mockEvent: UnifiedEvent = {
    source: { provider: 'gcal', id: 'evt-1', calendarId: 'calendar-1' },
    title: 'Team Standup',
    start: '2025-04-17T09:00:00Z',
    end: '2025-04-17T09:30:00Z',
    allDay: false,
    groupName: 'Work',
  }

  it('calls deleteEvent on the matching provider', async () => {
    const mockDeleteEvent = vi.fn().mockResolvedValue(undefined)
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn(),
        deleteEvent: mockDeleteEvent,
      },
    ] as any)

    await deleteUnifiedEvent(mockEvent)
    expect(mockDeleteEvent).toHaveBeenCalledWith(mockEvent)
  })

  it('throws when the provider for the event is not found', async () => {
    mockGetEventProviders.mockReturnValue([])

    await expect(deleteUnifiedEvent(mockEvent)).rejects.toThrow(
      'Provider "gcal" does not support deleting events',
    )
  })

  it('throws when provider does not support deleteEvent', async () => {
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn(),
        // no deleteEvent
      },
    ] as any)

    await expect(deleteUnifiedEvent(mockEvent)).rejects.toThrow(
      'Provider "gcal" does not support deleting events',
    )
  })

  it('propagates errors from the provider deleteEvent call', async () => {
    const mockDeleteEvent = vi.fn().mockRejectedValue(new Error('Delete failed'))
    mockGetEventProviders.mockReturnValue([
      {
        id: 'gcal',
        label: 'Google Calendar',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchEvents: vi.fn(),
        deleteEvent: mockDeleteEvent,
      },
    ] as any)

    await expect(deleteUnifiedEvent(mockEvent)).rejects.toThrow('Delete failed')
  })
})
