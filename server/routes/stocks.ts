import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'

// ── In-memory cache (2-min TTL) ─────────────────────────────────────────────

interface CacheEntry { data: any; expiry: number }
const quoteCache = new Map<string, CacheEntry>()
const CACHE_TTL = 2 * 60_000

function getCached(key: string): any | null {
  const entry = quoteCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) { quoteCache.delete(key); return null }
  return entry.data
}

function setCache(key: string, data: any) {
  quoteCache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

// ── Types ───────────────────────────────────────────────────────────────────

interface StockQuote {
  symbol:        string
  name:          string
  price:         number
  change:        number
  changePercent: number
  marketState:   string
}

// ── Yahoo Finance fetch ─────────────────────────────────────────────────────

async function fetchQuotes(symbols: string[]): Promise<StockQuote[]> {
  // Yahoo v7 quote API is blocked (401). Use v8 chart API directly.
  console.log('[stocks] fetching quotes for:', symbols.join(', '))
  const quotes = await fetchQuotesViaChart(symbols)
  console.log('[stocks] got', quotes.length, 'quotes:', quotes.map(q => `${q.symbol}=$${q.price}`).join(', '))
  return quotes
}

async function fetchQuotesViaChart(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      // Alternate between query1 and query2 to reduce rate limiting
      const host = Math.random() > 0.5 ? 'query1' : 'query2'
      const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        console.log(`[stocks] ${symbol} failed: HTTP ${res.status}`, await res.text().catch(() => ''))
        return null
      }

      const json = await res.json() as any
      const meta = json?.chart?.result?.[0]?.meta
      if (!meta) return null

      const price     = meta.regularMarketPrice ?? 0
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price
      const change    = price - prevClose
      const pct       = prevClose !== 0 ? (change / prevClose) * 100 : 0

      return {
        symbol:        meta.symbol ?? symbol,
        name:          meta.shortName || meta.longName || symbol,
        price,
        change,
        changePercent: pct,
        marketState:   (meta.marketState ?? 'CLOSED').toLowerCase().replace('_', '-'),
      } as StockQuote
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<StockQuote | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((q): q is StockQuote => q !== null)
}

// ── Router ──────────────────────────────────────────────────────────────────

export function stocksRouter(): Router {
  const router = Router()

  router.get('/stocks/quote', asyncRoute(async (req, res) => {
    const raw = req.query.symbols as string
    if (!raw) throw new AppError(400, 'Missing required query parameter: symbols')

    const symbols = raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 20) // max 20 symbols

    if (symbols.length === 0) throw new AppError(400, 'No valid symbols provided')

    const cacheKey = symbols.join(',')
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const quotes = await fetchQuotes(symbols)

    const result = { quotes, fetchedAt: new Date().toISOString() }
    // Only cache if we got data — don't cache empty results from rate limits
    if (quotes.length > 0) setCache(cacheKey, result)

    res.json(result)
  }))

  return router
}
