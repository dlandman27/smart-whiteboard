import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../../lib/apiFetch'
import { GCalProvider } from './gcal'

const mockApiFetch = vi.mocked(apiFetch)

const CALENDAR_ITEMS = [
  { id: 'cal-1', summary: 'Personal', backgroundColor: '#ff0000', primary: true },
  { id: 'cal-2', summary: 'Work', backgroundColor: '#0000ff' },
]

const GCAL_EVENT = {
  id: 'evt-1',
  summary: 'Team Meeting',
  description: 'Standup',
  location: 'Room 1',
  start: { dateTime: '2024-01-15T09:00:00Z' },
  end:   { dateTime: '2024-01-15T09:30:00Z' },
}

describe('GCalProvider', () => {
  let provider: GCalProvider

  beforeEach(() => {
    provider = new GCalProvider()
    mockApiFetch.mockReset()
  })

  describe('identity', () => {
    it('has correct id, label, icon', () => {
      expect(provider.id).toBe('gcal')
      expect(provider.label).toBe('Google Calendar')
      expect(typeof provider.icon).toBe('string')
    })
  })

  describe('isConnected()', () => {
    it('returns false initially (before async check completes)', () => {
      mockApiFetch.mockResolvedValue({ connected: true })
      expect(provider.isConnected()).toBe(false)
    })

    it('returns true after successful status check', async () => {
      mockApiFetch.mockResolvedValueOnce({ connected: true })
      provider.isConnected() // triggers background _checkStatus
      // Wait for microtask queue
      await new Promise((r) => setTimeout(r, 0))
      expect(provider.isConnected()).toBe(true)
    })

    it('returns false when status check fails', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Network error'))
      provider.isConnected()
      await new Promise((r) => setTimeout(r, 0))
      expect(provider.isConnected()).toBe(false)
    })
  })

  describe('fetchGroups()', () => {
    it('maps calendars to SourceGroups', async () => {
      mockApiFetch.mockResolvedValueOnce({ items: CALENDAR_ITEMS })
      const groups = await provider.fetchGroups()
      expect(groups).toHaveLength(2)
      expect(groups[0]).toEqual({ provider: 'gcal', groupName: 'Personal', color: '#ff0000' })
      expect(groups[1]).toEqual({ provider: 'gcal', groupName: 'Work', color: '#0000ff' })
    })

    it('returns empty array when items is empty', async () => {
      mockApiFetch.mockResolvedValueOnce({ items: [] })
      const groups = await provider.fetchGroups()
      expect(groups).toEqual([])
    })

    it('uses cached calendars within 2 minutes', async () => {
      mockApiFetch.mockResolvedValueOnce({ items: CALENDAR_ITEMS })
      await provider.fetchGroups()
      await provider.fetchGroups() // second call — should use cache
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchEvents()', () => {
    it('returns mapped UnifiedEvents for all calendars', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ items: CALENDAR_ITEMS }) // getCalendars
        .mockResolvedValueOnce({ items: [GCAL_EVENT] })   // events for cal-1
        .mockResolvedValueOnce({ items: [] })              // events for cal-2

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Team Meeting')
      expect(events[0].source).toEqual({ provider: 'gcal', id: 'evt-1', calendarId: 'cal-1' })
      expect(events[0].start).toBe('2024-01-15T09:00:00Z')
      expect(events[0].allDay).toBe(false)
      expect(events[0].readOnly).toBeUndefined()
    })

    it('marks all-day events when only date (no dateTime) is present', async () => {
      const allDayEvent = {
        id: 'evt-2',
        summary: 'Holiday',
        start: { date: '2024-01-15' },
        end:   { date: '2024-01-16' },
      }
      mockApiFetch
        .mockResolvedValueOnce({ items: [CALENDAR_ITEMS[0]] })
        .mockResolvedValueOnce({ items: [allDayEvent] })

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events[0].allDay).toBe(true)
      expect(events[0].start).toBe('2024-01-15')
    })

    it('filters to specific groupIds when provided', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ items: CALENDAR_ITEMS })
        .mockResolvedValueOnce({ items: [GCAL_EVENT] })

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31', ['cal-1'])
      // Only one calendar fetched, only one apiFetch for events
      expect(mockApiFetch).toHaveBeenCalledTimes(2)
      expect(events).toHaveLength(1)
    })

    it('uses "(No title)" when event has no summary', async () => {
      const noTitle = { id: 'x', start: { dateTime: '2024-01-15T10:00:00Z' }, end: { dateTime: '2024-01-15T11:00:00Z' } }
      mockApiFetch
        .mockResolvedValueOnce({ items: [CALENDAR_ITEMS[0]] })
        .mockResolvedValueOnce({ items: [noTitle] })

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events[0].title).toBe('(No title)')
    })

    it('skips calendars that fail, returning events from others', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ items: CALENDAR_ITEMS })
        .mockRejectedValueOnce(new Error('403 Forbidden'))  // cal-1 fails
        .mockResolvedValueOnce({ items: [GCAL_EVENT] })      // cal-2 succeeds

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events).toHaveLength(1)
    })
  })

  describe('createEvent()', () => {
    it('calls apiFetch POST with correct body for timed event', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      await provider.createEvent('cal-1', {
        title: 'Lunch',
        start: '2024-01-15T12:00:00Z',
        end:   '2024-01-15T13:00:00Z',
        allDay: false,
      })
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/gcal/events',
        expect.objectContaining({ method: 'POST' })
      )
      const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
      expect(body.summary).toBe('Lunch')
      expect(body.start.dateTime).toBe('2024-01-15T12:00:00Z')
    })

    it('calls apiFetch POST with date-only for all-day event', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      await provider.createEvent('cal-1', {
        title:  'Birthday',
        start:  '2024-01-15T00:00:00Z',
        allDay: true,
      })
      const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
      expect(body.start.date).toBe('2024-01-15')
      expect(body.start.dateTime).toBeUndefined()
    })
  })

  describe('deleteEvent()', () => {
    it('calls apiFetch DELETE with calendarId and eventId', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      const event = {
        source: { provider: 'gcal' as const, id: 'evt-1', calendarId: 'cal-1' },
        title: 'Test', start: '2024-01-15', allDay: false, groupName: 'Personal',
      }
      await provider.deleteEvent(event)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('cal-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('evt-1'),
        expect.anything()
      )
    })

    it('skips delete for non-gcal events', async () => {
      const event = {
        source: { provider: 'ical' as const, id: 'x', feedUrl: 'http://example.com' },
        title: 'Test', start: '2024-01-15', allDay: false, groupName: 'Feed',
      }
      await provider.deleteEvent(event)
      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })
})
