import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── board-utils mock ──────────────────────────────────────────────────────────
const mockCreateWidget = vi.fn()
vi.mock('../board-utils.js', () => ({
  canvas: {
    createWidget: (...args: any[]) => mockCreateWidget(...args),
  },
  ordinal:     (n: number) => {
    const s = ['th','st','nd','rd']
    const v = n % 100
    return (s[(v - 20) % 10] ?? s[v] ?? s[0])
  },
  leagueLabel: (key: string) => {
    const labels: Record<string, string> = {
      premierleague: 'Premier League',
      laliga:        'La Liga',
      bundesliga:    'Bundesliga',
    }
    return labels[key] ?? key
  },
}))

// ── logger mock ───────────────────────────────────────────────────────────────
vi.mock('../../lib/logger.js', () => ({
  log: vi.fn(),
}))

// ── Global fetch mock ─────────────────────────────────────────────────────────
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { webTools } from './web.js'

const fakeCtx = { notion: {} as any, gcal: null, userId: 'uid' }

function getTool(name: string) {
  const t = webTools.find((t) => t.definition.name === name)
  if (!t) throw new Error(`Tool ${name} not found`)
  return t
}

describe('web tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.BRAVE_SEARCH_API_KEY
    delete process.env.VITE_BRAVE_SEARCH_API_KEY
    delete process.env.BING_SEARCH_API_KEY
    delete process.env.VITE_BING_SEARCH_API_KEY
    delete process.env.PORT
  })

  // ── web_search ────────────────────────────────────────────────────────────

  describe('web_search', () => {
    it('returns unavailable message when no API key', async () => {
      const tool   = getTool('web_search')
      const result = await tool.execute({ query: 'test query' }, fakeCtx)
      expect(result).toMatch(/unavailable/)
      expect(result).toMatch(/BRAVE_SEARCH_API_KEY/)
    })

    it('searches Brave API and returns JSON results', async () => {
      process.env.BRAVE_SEARCH_API_KEY = 'brave-key'

      mockFetch.mockResolvedValue({
        ok:   true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          web: {
            results: [
              { title: 'Result One',   description: 'Snippet one',   url: 'https://example.com/1' },
              { title: 'Result Two',   description: 'Snippet two',   url: 'https://example.com/2' },
            ],
          },
        })),
      })

      const tool   = getTool('web_search')
      const result = await tool.execute({ query: 'Premier League table' }, fakeCtx)

      const parsed = JSON.parse(result)
      expect(parsed).toHaveLength(2)
      expect(parsed[0].title).toBe('Result One')
      expect(parsed[0].url).toBe('https://example.com/1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('brave.com'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Subscription-Token': 'brave-key' }),
        }),
      )
    })

    it('uses BING_SEARCH_API_KEY as fallback', async () => {
      process.env.BING_SEARCH_API_KEY = 'bing-key'

      mockFetch.mockResolvedValue({
        ok:   true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({ web: { results: [] } })),
      })

      const tool = getTool('web_search')
      await tool.execute({ query: 'test' }, fakeCtx)

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].headers['X-Subscription-Token']).toBe('bing-key')
    })

    it('returns error message when search API returns non-ok', async () => {
      process.env.BRAVE_SEARCH_API_KEY = 'brave-key'

      mockFetch.mockResolvedValue({
        ok:     false,
        status: 429,
        text:   vi.fn().mockResolvedValue('Rate limit exceeded'),
      })

      const tool   = getTool('web_search')
      const result = await tool.execute({ query: 'test' }, fakeCtx)
      expect(result).toMatch(/Search failed/)
      expect(result).toContain('429')
    })

    it('returns empty array when no web results', async () => {
      process.env.BRAVE_SEARCH_API_KEY = 'brave-key'

      mockFetch.mockResolvedValue({
        ok:   true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({})),
      })

      const tool   = getTool('web_search')
      const result = await tool.execute({ query: 'obscure query' }, fakeCtx)
      expect(JSON.parse(result)).toEqual([])
    })
  })

  // ── fetch_page ────────────────────────────────────────────────────────────

  describe('fetch_page', () => {
    it('fetches a page and returns stripped text', async () => {
      const html = `<html><head><title>Test</title><style>body{color:red}</style></head>
        <body><h1>Hello World</h1><p>This is a paragraph.</p>
        <script>console.log('skip me')</script></body></html>`

      mockFetch.mockResolvedValue({
        ok:   true,
        text: vi.fn().mockResolvedValue(html),
      })

      const tool   = getTool('fetch_page')
      const result = await tool.execute({ url: 'https://example.com' }, fakeCtx)

      expect(result).toContain('Hello World')
      expect(result).toContain('This is a paragraph')
      expect(result).not.toContain('<h1>')
      expect(result).not.toContain('<p>')
      expect(result).not.toContain("console.log")
      expect(result).not.toContain('color:red')
    })

    it('returns error message when fetch fails (non-ok)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 403 })

      const tool   = getTool('fetch_page')
      const result = await tool.execute({ url: 'https://blocked.com' }, fakeCtx)
      expect(result).toMatch(/Failed to fetch page: 403/)
    })

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const tool   = getTool('fetch_page')
      const result = await tool.execute({ url: 'https://offline.example.com' }, fakeCtx)
      expect(result).toMatch(/Could not fetch page/)
      expect(result).toContain('ECONNREFUSED')
    })

    it('truncates long pages to 5000 chars at a sentence boundary', async () => {
      // Create a page with 6000+ characters of text in sentences
      const sentences = Array.from({ length: 60 }, (_, i) => `This is sentence ${i + 1}.`).join(' ')
      const html = `<html><body><p>${sentences}</p></body></html>`

      mockFetch.mockResolvedValue({
        ok:   true,
        text: vi.fn().mockResolvedValue(html),
      })

      const tool   = getTool('fetch_page')
      const result = await tool.execute({ url: 'https://long.com' }, fakeCtx)

      expect(result.length).toBeLessThanOrEqual(5000)
      // Should end at a sentence boundary (period, !, or ?)
      expect(result).toMatch(/[.!?]$/)
    })
  })

  // ── get_standings ─────────────────────────────────────────────────────────

  describe('get_standings', () => {
    const mockTable = [
      { pos: 1, team: 'Man City',  gp: 30, w: 22, d: 5, l: 3, gd: 45, pts: 71 },
      { pos: 2, team: 'Arsenal',   gp: 30, w: 20, d: 5, l: 5, gd: 30, pts: 65 },
      { pos: 3, team: 'Liverpool', gp: 30, w: 18, d: 8, l: 4, gd: 28, pts: 62 },
    ]

    beforeEach(() => {
      process.env.PORT = '3001'
    })

    it('returns JSON table when display is false', async () => {
      mockFetch.mockResolvedValue({
        ok:   true,
        json: vi.fn().mockResolvedValue({ table: mockTable }),
      })

      const tool   = getTool('get_standings')
      const result = await tool.execute({ league: 'premierleague', display: false }, fakeCtx)

      const parsed = JSON.parse(result)
      expect(parsed).toHaveLength(3)
      expect(parsed[0].team).toBe('Man City')
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/standings/premierleague')
    })

    it('filters to a specific team when team param provided', async () => {
      mockFetch.mockResolvedValue({
        ok:   true,
        json: vi.fn().mockResolvedValue({ table: mockTable }),
      })

      const tool   = getTool('get_standings')
      const result = await tool.execute({ league: 'premierleague', team: 'Arsenal' }, fakeCtx)

      expect(result).toContain('Arsenal')
      expect(result).toContain('2nd')
      expect(result).toContain('65 points')
    })

    it('returns not found message when team not in table', async () => {
      mockFetch.mockResolvedValue({
        ok:   true,
        json: vi.fn().mockResolvedValue({ table: mockTable }),
      })

      const tool   = getTool('get_standings')
      const result = await tool.execute({ league: 'premierleague', team: 'Chelsea' }, fakeCtx)

      expect(result).toMatch(/not found/)
    })

    it('creates HTML widget when display is true', async () => {
      mockFetch.mockResolvedValue({
        ok:   true,
        json: vi.fn().mockResolvedValue({ table: mockTable }),
      })
      mockCreateWidget.mockReturnValue({ id: 'widget-123' })

      const tool   = getTool('get_standings')
      const result = await tool.execute({ league: 'premierleague', display: true }, fakeCtx)

      expect(mockCreateWidget).toHaveBeenCalledWith(expect.objectContaining({
        widgetType: '@whiteboard/html',
        label:      'Premier League',
      }))
      expect(result).toContain('widget-123')
      expect(result).toContain('Premier League')
    })

    it('returns error message when fetch fails', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 400 })

      const tool   = getTool('get_standings')
      const result = await tool.execute({ league: 'premierleague' }, fakeCtx)

      expect(result).toMatch(/Could not fetch standings/)
    })

    it('uses PORT env variable for internal request', async () => {
      process.env.PORT = '4000'
      mockFetch.mockResolvedValue({
        ok:   true,
        json: vi.fn().mockResolvedValue({ table: [] }),
      })

      const tool = getTool('get_standings')
      await tool.execute({ league: 'laliga' }, fakeCtx)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/api/standings/laliga')
    })
  })
})
