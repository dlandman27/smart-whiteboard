import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'

// ── Simple feed cache (5-min TTL) ────────────────────────────────────────────

interface CacheEntry { data: any; expiry: number }
const feedCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60_000

function getCached(key: string): any | null {
  const entry = feedCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) { feedCache.delete(key); return null }
  return entry.data
}

function setCache(key: string, data: any) {
  feedCache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

// ── ICS date parsing ─────────────────────────────────────────────────────────

function parseICSDate(value: string): Date {
  // Formats: 20250415T130000Z, 20250415T130000, 20250415
  const clean = value.replace(/[^0-9TZ]/g, '')
  if (clean.length === 8) {
    // All-day date: YYYYMMDD
    return new Date(
      parseInt(clean.slice(0, 4)),
      parseInt(clean.slice(4, 6)) - 1,
      parseInt(clean.slice(6, 8)),
    )
  }
  const y = parseInt(clean.slice(0, 4))
  const mo = parseInt(clean.slice(4, 6)) - 1
  const d = parseInt(clean.slice(6, 8))
  const h = parseInt(clean.slice(9, 11))
  const mi = parseInt(clean.slice(11, 13))
  const s = parseInt(clean.slice(13, 15)) || 0
  if (clean.endsWith('Z')) {
    return new Date(Date.UTC(y, mo, d, h, mi, s))
  }
  return new Date(y, mo, d, h, mi, s)
}

function isAllDayValue(value: string): boolean {
  return /^\d{8}$/.test(value.replace(/[^0-9]/g, '').slice(0, 8)) && !value.includes('T')
}

// ── Duration parsing (ISO 8601 / ICS DURATION) ──────────────────────────────

function parseDuration(dur: string): number {
  // e.g. PT1H30M, P1DT2H, PT15M, P7W
  let ms = 0
  const weeks = dur.match(/(\d+)W/)
  const days = dur.match(/(\d+)D/)
  const hours = dur.match(/(\d+)H/)
  const mins = dur.match(/(\d+)M/)
  const secs = dur.match(/T.*?(\d+)S/)
  if (weeks) ms += parseInt(weeks[1]) * 7 * 86400_000
  if (days) ms += parseInt(days[1]) * 86400_000
  if (hours) ms += parseInt(hours[1]) * 3600_000
  if (mins) ms += parseInt(mins[1]) * 60_000
  if (secs) ms += parseInt(secs[1]) * 1000
  return ms
}

// ── RRULE expansion ──────────────────────────────────────────────────────────

interface RRuleParts {
  freq: string
  count?: number
  until?: Date
  interval: number
  byday?: string[]
}

function parseRRule(line: string): RRuleParts {
  const parts: Record<string, string> = {}
  line.replace(/^RRULE:/, '').split(';').forEach((p) => {
    const [k, v] = p.split('=')
    if (k && v) parts[k] = v
  })
  return {
    freq: parts.FREQ || 'DAILY',
    count: parts.COUNT ? parseInt(parts.COUNT) : undefined,
    until: parts.UNTIL ? parseICSDate(parts.UNTIL) : undefined,
    interval: parts.INTERVAL ? parseInt(parts.INTERVAL) : 1,
    byday: parts.BYDAY ? parts.BYDAY.split(',') : undefined,
  }
}

function expandRecurring(
  start: Date,
  rrule: RRuleParts,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const dates: Date[] = []
  const maxOccurrences = rrule.count ?? 365 // safety cap
  let current = new Date(start)
  let count = 0

  for (let i = 0; i < 1000 && count < maxOccurrences; i++) {
    if (rrule.until && current > rrule.until) break
    if (current > rangeEnd) break

    if (current >= rangeStart && i > 0) {
      dates.push(new Date(current))
      count++
    } else if (i > 0) {
      count++ // count occurrences even before range for COUNT limit
    }

    // Advance to next occurrence
    const next = new Date(current)
    switch (rrule.freq) {
      case 'DAILY':
        next.setDate(next.getDate() + rrule.interval)
        break
      case 'WEEKLY':
        next.setDate(next.getDate() + 7 * rrule.interval)
        break
      case 'MONTHLY':
        next.setMonth(next.getMonth() + rrule.interval)
        break
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + rrule.interval)
        break
      default:
        return dates // unsupported frequency
    }
    current = next
  }

  return dates
}

// ── ICS parser ───────────────────────────────────────────────────────────────

interface ICalEvent {
  uid: string
  title: string
  start: string
  end?: string
  location?: string
  description?: string
  allDay: boolean
}

interface ParsedICal {
  calendarName: string
  events: ICalEvent[]
}

function unfoldLines(ics: string): string {
  // ICS long-line folding: a line starting with space/tab is a continuation
  return ics.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function getProperty(block: string, prop: string): string | undefined {
  // Match property with optional params, e.g. DTSTART;VALUE=DATE:20250415
  const re = new RegExp(`^${prop}(?:[;][^:]*)?:(.*)$`, 'm')
  const m = block.match(re)
  return m?.[1]?.trim()
}

function parseICS(ics: string, daysAhead: number): ParsedICal {
  const text = unfoldLines(ics)
  const calendarName = getProperty(text, 'X-WR-CALNAME') || getProperty(text, 'PRODID') || 'Calendar'

  const now = new Date()
  const rangeStart = new Date(now)
  rangeStart.setHours(0, 0, 0, 0)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setDate(rangeEnd.getDate() + daysAhead)
  rangeEnd.setHours(23, 59, 59, 999)

  const events: ICalEvent[] = []
  const eventRegex = /BEGIN:VEVENT\n([\s\S]*?)END:VEVENT/g
  let m: RegExpExecArray | null

  while ((m = eventRegex.exec(text)) !== null) {
    const block = m[1]

    const uid = getProperty(block, 'UID') || crypto.randomUUID()
    const summary = getProperty(block, 'SUMMARY') || '(No title)'
    const location = getProperty(block, 'LOCATION')
    const rawDesc = getProperty(block, 'DESCRIPTION')
    const description = rawDesc
      ? rawDesc.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\').slice(0, 200)
      : undefined

    const dtStartRaw = getProperty(block, 'DTSTART')
    if (!dtStartRaw) continue

    const allDay = isAllDayValue(dtStartRaw)
    const dtStart = parseICSDate(dtStartRaw)

    const dtEndRaw = getProperty(block, 'DTEND')
    const durationRaw = getProperty(block, 'DURATION')
    let dtEnd: Date | undefined
    if (dtEndRaw) {
      dtEnd = parseICSDate(dtEndRaw)
    } else if (durationRaw) {
      dtEnd = new Date(dtStart.getTime() + parseDuration(durationRaw))
    }

    const rruleRaw = getProperty(block, 'RRULE')

    // Helper to push a single occurrence
    function pushEvent(start: Date, end?: Date) {
      // Check if event falls in range
      const eventEnd = end || start
      if (eventEnd < rangeStart || start > rangeEnd) return

      events.push({
        uid,
        title: summary,
        start: start.toISOString(),
        end: end?.toISOString(),
        location: location || undefined,
        description,
        allDay,
      })
    }

    // Push the original occurrence
    pushEvent(dtStart, dtEnd)

    // Expand recurring events
    if (rruleRaw) {
      const rrule = parseRRule(rruleRaw)
      const duration = dtEnd ? dtEnd.getTime() - dtStart.getTime() : 0
      const recurrences = expandRecurring(dtStart, rrule, rangeStart, rangeEnd)
      for (const recStart of recurrences) {
        const recEnd = duration > 0 ? new Date(recStart.getTime() + duration) : undefined
        pushEvent(recStart, recEnd)
      }
    }
  }

  // Sort by start time
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  return { calendarName, events }
}

export { parseICS }
export type { ICalEvent, ParsedICal }

// ── Router ───────────────────────────────────────────────────────────────────

export function icalRouter(): Router {
  const router = Router()

  router.get('/ical/events', asyncRoute(async (req, res) => {
    const url = req.query.url as string
    if (!url) throw new AppError(400, 'Missing required query parameter: url')

    try { new URL(url) } catch { throw new AppError(400, 'Invalid URL') }

    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 30)
    const cacheKey = `${url}:${days}`

    // Check cache first
    const cached = getCached(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    // Fetch the ICS file
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'SmartWhiteboard/1.0 iCal Reader',
        Accept: 'text/calendar, application/calendar+json, text/plain',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!r.ok) throw new AppError(502, `Failed to fetch calendar: ${r.status} ${r.statusText}`)

    const text = await r.text()
    if (!text.includes('BEGIN:VCALENDAR')) {
      throw new AppError(422, 'Response is not a valid iCalendar file')
    }

    const result = parseICS(text, days)
    setCache(cacheKey, result)

    res.json(result)
  }))

  return router
}
