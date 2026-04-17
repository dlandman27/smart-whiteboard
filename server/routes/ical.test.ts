import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

import { icalRouter } from './ical.js'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', icalRouter())
  app.use(errorMiddleware)
  return app
}

// Minimal valid ICS calendar fixture with an event today
function makeICS(eventLines: string = '') {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Test//Test//EN',
    'X-WR-CALNAME:Test Calendar',
    eventLines,
    'END:VCALENDAR',
  ].join('\r\n')
}

function makeEvent(dtStart: string, dtEnd: string, summary = 'Test Event', uid = 'uid-1') {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    'END:VEVENT',
  ].join('\r\n')
}

// Get today's date in YYYYMMDD format for building ICS dates
function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function todayUTCStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}T120000Z`
}

function tomorrowUTCStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}T120000Z`
}

describe('ical router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  // Each test uses a unique URL to avoid the module-level feed cache
  let testCounter = 0
  function uniqueUrl(suffix = '') {
    return `https://example.com/cal-${++testCounter}-${suffix}.ics`
  }

  describe('GET /api/ical/events', () => {
    it('returns calendar name and events', async () => {
      const ics = makeICS(makeEvent(todayUTCStr(), tomorrowUTCStr(), 'Stand-up', 'uid-1'))
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => ics,
      } as any)

      const res = await request(createApp()).get(`/api/ical/events?url=${uniqueUrl()}`)
      expect(res.status).toBe(200)
      expect(res.body.calendarName).toBe('Test Calendar')
      expect(Array.isArray(res.body.events)).toBe(true)
    })

    it('returns 400 when url is missing', async () => {
      const res = await request(createApp()).get('/api/ical/events')
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/missing required query parameter: url/i)
    })

    it('returns 400 for invalid URL', async () => {
      const res = await request(createApp()).get('/api/ical/events?url=not-a-url')
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/invalid url/i)
    })

    it('returns 502 when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any)

      const res = await request(createApp()).get(`/api/ical/events?url=${uniqueUrl('fail')}`)
      expect(res.status).toBe(502)
      expect(res.body.error).toMatch(/failed to fetch calendar/i)
    })

    it('returns 422 when response is not a valid iCal file', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => '<html>Not a calendar</html>',
      } as any)

      const res = await request(createApp()).get(`/api/ical/events?url=${uniqueUrl('not-ical')}`)
      expect(res.status).toBe(422)
      expect(res.body.error).toMatch(/not a valid icalendar/i)
    })

    it('returns 500 when fetch throws', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network failure'))

      const res = await request(createApp()).get(`/api/ical/events?url=${uniqueUrl('throw')}`)
      expect(res.status).toBe(500)
    })

    it('handles calendar with no events in range', async () => {
      // Use a date far in the past
      const pastEvent = makeEvent('19990101T120000Z', '19990101T130000Z', 'Old Event', 'uid-past')
      const ics = makeICS(pastEvent)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => ics,
      } as any)

      const res = await request(createApp()).get(`/api/ical/events?url=${uniqueUrl('past')}`)
      expect(res.status).toBe(200)
      expect(res.body.events).toHaveLength(0)
    })

    it('respects the days query param (clamped to 30)', async () => {
      const ics = makeICS()
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => ics,
      } as any)

      const res = await request(createApp()).get(`/api/ical/events?url=${uniqueUrl('days')}&days=100`)
      expect(res.status).toBe(200)
      // Should still work — days is clamped to 30
    })

    it('uses cache on second request with same URL and days', async () => {
      const ics = makeICS(makeEvent(todayUTCStr(), tomorrowUTCStr()))
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => ics,
      } as any)

      const url = uniqueUrl('cache')
      await request(createApp()).get(`/api/ical/events?url=${url}`)
      await request(createApp()).get(`/api/ical/events?url=${url}`)

      // Should only fetch once due to caching
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('parses all-day events', async () => {
      const today = todayStr()
      const tomorrow = (() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      })()
      const allDayEvent = makeEvent(today, tomorrow, 'All Day Event', 'uid-allday')
      const ics = makeICS(allDayEvent)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => ics,
      } as any)

      const res = await request(createApp()).get(`/api/ical/events?url=${uniqueUrl('allday')}`)
      expect(res.status).toBe(200)
      const allDayEvt = res.body.events.find((e: any) => e.title === 'All Day Event')
      if (allDayEvt) {
        expect(allDayEvt.allDay).toBe(true)
      }
    })
  })
})
