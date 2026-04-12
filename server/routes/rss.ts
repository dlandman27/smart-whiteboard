import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'

// ── Simple feed cache (5-min TTL) ────────────────────────────────────────────

interface CacheEntry { data: any; expiry: number }
const feedCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60_000

function getCached(url: string): any | null {
  const entry = feedCache.get(url)
  if (!entry) return null
  if (Date.now() > entry.expiry) { feedCache.delete(url); return null }
  return entry.data
}

function setCache(url: string, data: any) {
  feedCache.set(url, { data, expiry: Date.now() + CACHE_TTL })
}

// ── HTML tag stripping ───────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

// ── Minimal RSS/Atom parser using DOMParser-style regex ──────────────────────
// We avoid a heavy dependency by parsing the XML ourselves for the fields we need.

interface FeedItem {
  title:      string
  link:       string
  pubDate?:   string
  content?:   string
  thumbnail?: string
}

interface ParsedFeed {
  title:       string
  description: string
  items:       FeedItem[]
}

function extractTag(xml: string, tag: string): string {
  // Handle both <tag>content</tag> and <tag><![CDATA[content]]></tag>
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`, 'i')
  const m = xml.match(re)
  return (m?.[1] ?? m?.[2] ?? '').trim()
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')
  return xml.match(re)?.[1] ?? ''
}

function parseFeed(xml: string): ParsedFeed {
  const isAtom = /<feed[\s>]/i.test(xml)

  if (isAtom) {
    return parseAtom(xml)
  }
  return parseRSS(xml)
}

function parseRSS(xml: string): ParsedFeed {
  const channelMatch = xml.match(/<channel>([\s\S]*)<\/channel>/i)
  const channel = channelMatch?.[1] ?? xml

  const title = extractTag(channel, 'title')
  const description = extractTag(channel, 'description')

  const items: FeedItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const itemTitle = extractTag(block, 'title')
    const link = extractTag(block, 'link') || extractAttr(block, 'link', 'href')
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date')
    const desc = extractTag(block, 'description') || extractTag(block, 'content:encoded')
    const content = desc ? stripHtml(desc).slice(0, 200) : undefined
    const thumbnail = extractAttr(block, 'enclosure', 'url')
      || extractAttr(block, 'media:thumbnail', 'url')
      || extractAttr(block, 'media:content', 'url')
      || undefined

    items.push({ title: itemTitle, link, pubDate, content, thumbnail })
  }

  return { title, description, items }
}

function parseAtom(xml: string): ParsedFeed {
  const title = extractTag(xml, 'title')
  const description = extractTag(xml, 'subtitle') || ''

  const items: FeedItem[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
  let m: RegExpExecArray | null
  while ((m = entryRegex.exec(xml)) !== null) {
    const block = m[1]
    const entryTitle = extractTag(block, 'title')
    const link = extractAttr(block, 'link', 'href')
    const pubDate = extractTag(block, 'published') || extractTag(block, 'updated')
    const desc = extractTag(block, 'summary') || extractTag(block, 'content')
    const content = desc ? stripHtml(desc).slice(0, 200) : undefined
    const thumbnail = extractAttr(block, 'media:thumbnail', 'url') || undefined

    items.push({ title: entryTitle, link, pubDate, content, thumbnail })
  }

  return { title, description, items }
}

// ── Router ───────────────────────────────────────────────────────────────────

export function rssRouter(): Router {
  const router = Router()

  router.get('/rss/feed', asyncRoute(async (req, res) => {
    const url = req.query.url as string
    if (!url) throw new AppError(400, 'Missing required query parameter: url')

    try { new URL(url) } catch { throw new AppError(400, 'Invalid URL') }

    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50)

    // Check cache first
    const cached = getCached(url)
    if (cached) {
      return res.json({ ...cached, items: cached.items.slice(0, limit) })
    }

    // Fetch the feed
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'SmartWhiteboard/1.0 RSS Reader',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!r.ok) throw new AppError(502, `Failed to fetch feed: ${r.status} ${r.statusText}`)

    const text = await r.text()
    const feed = parseFeed(text)

    setCache(url, feed)

    res.json({
      title:       feed.title,
      description: feed.description,
      items:       feed.items.slice(0, limit),
    })
  }))

  return router
}
