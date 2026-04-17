import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { rssRouter } from './rss.js'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() },
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test RSS feed</description>
    <item>
      <title>Article One</title>
      <link>https://example.com/one</link>
      <pubDate>Thu, 17 Apr 2026 10:00:00 +0000</pubDate>
      <description>Summary of article one.</description>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/two</link>
      <pubDate>Thu, 17 Apr 2026 11:00:00 +0000</pubDate>
      <description><![CDATA[<p>Summary of <b>article</b> two.</p>]]></description>
    </item>
  </channel>
</rss>`

const ATOM_XML = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <subtitle>Atom subtitle</subtitle>
  <entry>
    <title>Atom Entry One</title>
    <link href="https://example.com/atom/one"/>
    <published>2026-04-17T10:00:00Z</published>
    <summary>Atom summary one.</summary>
  </entry>
</feed>`

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', rssRouter())
  app.use(errorMiddleware)
  return app
}

describe('rss routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /rss/feed returns 400 when url is missing', async () => {
    const res = await request(buildApp()).get('/api/rss/feed')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/url/)
  })

  it('GET /rss/feed returns 400 for invalid URL', async () => {
    const res = await request(buildApp()).get('/api/rss/feed?url=not-a-url')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Invalid URL/)
  })

  it('GET /rss/feed parses RSS feed and returns items', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      text: vi.fn().mockResolvedValue(RSS_XML),
    })

    const res = await request(buildApp()).get('/api/rss/feed?url=https://example.com/feed.rss')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Test Feed')
    expect(res.body.description).toBe('A test RSS feed')
    expect(res.body.items).toHaveLength(2)
    expect(res.body.items[0].title).toBe('Article One')
    expect(res.body.items[0].link).toBe('https://example.com/one')
  })

  it('GET /rss/feed parses Atom feed', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      text: vi.fn().mockResolvedValue(ATOM_XML),
    })

    const res = await request(buildApp()).get('/api/rss/feed?url=https://example.com/feed.atom')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Atom Feed')
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].title).toBe('Atom Entry One')
    expect(res.body.items[0].link).toBe('https://example.com/atom/one')
  })

  it('GET /rss/feed respects limit query param', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      text: vi.fn().mockResolvedValue(RSS_XML),
    })

    const res = await request(buildApp()).get('/api/rss/feed?url=https://example.com/limit-feed.rss&limit=1')
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
  })

  it('GET /rss/feed returns 502 when upstream fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok:         false,
      status:     503,
      statusText: 'Service Unavailable',
    })

    // Use a unique URL so it's not served from cache populated by previous tests
    const res = await request(buildApp()).get('/api/rss/feed?url=https://example.com/broken-feed.rss')
    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/Failed to fetch feed/)
  })

  it('GET /rss/feed strips HTML from description', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      text: vi.fn().mockResolvedValue(RSS_XML),
    })

    // Use unique URL so it's not cached from the parse test above
    const res = await request(buildApp()).get('/api/rss/feed?url=https://example.com/html-strip-feed.rss')
    expect(res.status).toBe(200)
    // CDATA content should have HTML stripped
    const second = res.body.items[1]
    expect(second.content).not.toContain('<')
    expect(second.content).not.toContain('>')
  })

  it('GET /rss/feed serves from cache on second request', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      text: vi.fn().mockResolvedValue(RSS_XML),
    })

    const url = 'https://example.com/cached-feed.rss'
    await request(buildApp()).get(`/api/rss/feed?url=${url}`)
    // Second request — fetch should only have been called once
    await request(buildApp()).get(`/api/rss/feed?url=${url}`)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
