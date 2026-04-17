import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../../lib/apiFetch'
import { ICalProvider } from './ical'

const mockApiFetch = vi.mocked(apiFetch)

const FEED_1 = { url: 'https://example.com/cal.ics', name: 'My Feed', color: '#00ff00' }
const FEED_2 = { url: 'https://other.com/cal.ics' }

const ICAL_DATA = {
  calendarName: 'Example Calendar',
  events: [
    { uid: 'uid-1', title: 'Yoga', start: '2024-01-15T07:00:00Z', end: '2024-01-15T08:00:00Z', allDay: false },
    { uid: 'uid-2', title: 'Holiday', start: '2024-01-20', allDay: true },
  ],
}

describe('ICalProvider', () => {
  let provider: ICalProvider

  beforeEach(() => {
    provider = new ICalProvider()
    mockApiFetch.mockReset()
  })

  describe('identity', () => {
    it('has correct id, label, icon', () => {
      expect(provider.id).toBe('ical')
      expect(provider.label).toBe('iCal Feeds')
      expect(typeof provider.icon).toBe('string')
    })
  })

  describe('isConnected()', () => {
    it('returns false when no feeds are set', () => {
      expect(provider.isConnected()).toBe(false)
    })

    it('returns true after setFeeds with at least one feed', () => {
      provider.setFeeds([FEED_1])
      expect(provider.isConnected()).toBe(true)
    })

    it('returns false after setFeeds with empty array', () => {
      provider.setFeeds([])
      expect(provider.isConnected()).toBe(false)
    })
  })

  describe('fetchGroups()', () => {
    it('returns one SourceGroup per feed using name when available', async () => {
      provider.setFeeds([FEED_1, FEED_2])
      const groups = await provider.fetchGroups()
      expect(groups).toHaveLength(2)
      expect(groups[0]).toEqual({ provider: 'ical', groupName: 'My Feed', color: '#00ff00' })
      expect(groups[1]).toEqual({ provider: 'ical', groupName: FEED_2.url, color: undefined })
    })

    it('returns empty array when no feeds are configured', async () => {
      const groups = await provider.fetchGroups()
      expect(groups).toEqual([])
    })
  })

  describe('fetchEvents()', () => {
    it('returns empty array when no feeds are set', async () => {
      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events).toEqual([])
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('maps API response to UnifiedEvents', async () => {
      provider.setFeeds([FEED_1])
      mockApiFetch.mockResolvedValueOnce(ICAL_DATA)

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({
        source:    { provider: 'ical', id: 'uid-1', feedUrl: FEED_1.url },
        title:     'Yoga',
        start:     '2024-01-15T07:00:00Z',
        allDay:    false,
        groupName: 'My Feed',
        groupColor: '#00ff00',
        readOnly:  true,
      })
      expect(events[1]).toMatchObject({
        title:  'Holiday',
        allDay: true,
      })
    })

    it('uses calendarName from API when feed has no name', async () => {
      provider.setFeeds([FEED_2])
      mockApiFetch.mockResolvedValueOnce(ICAL_DATA)

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events[0].groupName).toBe('Example Calendar')
    })

    it('falls back to feed URL when no name and no calendarName', async () => {
      provider.setFeeds([FEED_2])
      mockApiFetch.mockResolvedValueOnce({ calendarName: null, events: ICAL_DATA.events })

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events[0].groupName).toBe(FEED_2.url)
    })

    it('filters to specific groupIds when provided', async () => {
      provider.setFeeds([FEED_1, FEED_2])
      mockApiFetch.mockResolvedValueOnce(ICAL_DATA)

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31', [FEED_1.url])
      // Only one apiFetch call — only FEED_1 was fetched
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
      expect(events).toHaveLength(2)
    })

    it('returns empty array for that feed when fetch fails, not breaking others', async () => {
      provider.setFeeds([FEED_1, FEED_2])
      mockApiFetch
        .mockRejectedValueOnce(new Error('Network error'))  // FEED_1 fails
        .mockResolvedValueOnce(ICAL_DATA)                   // FEED_2 succeeds

      const events = await provider.fetchEvents('2024-01-01', '2024-01-31')
      expect(events).toHaveLength(2)  // only FEED_2's events
    })

    it('passes calculated days param to the API', async () => {
      provider.setFeeds([FEED_1])
      mockApiFetch.mockResolvedValueOnce({ calendarName: '', events: [] })

      await provider.fetchEvents('2024-01-01', '2024-01-08')

      const url = mockApiFetch.mock.calls[0][0] as string
      expect(url).toContain('days=7')
    })

    it('does not have createEvent method', () => {
      expect((provider as any).createEvent).toBeUndefined()
    })

    it('does not have deleteEvent method', () => {
      expect((provider as any).deleteEvent).toBeUndefined()
    })
  })
})
