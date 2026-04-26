import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'
// @ts-ignore
import _yf from 'yahoo-finance2'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (_yf as any)({ suppressNotices: ['yahooSurvey'] })

// ── Cache (2-min TTL) ────────────────────────────────────────────────────────

interface CacheEntry { data: any; expiry: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 2 * 60_000

function getCached(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) { cache.delete(key); return null }
  return entry.data
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface StockQuote {
  symbol:        string
  name:          string
  price:         number
  change:        number
  changePercent: number
  open:          number
  high:          number
  low:           number
  volume:        number
  marketCap:     number | null
  peRatio:       number | null
  marketState:   string
  points:        number[]   // intraday close prices for sparkline
}

// ── Fetch ────────────────────────────────────────────────────────────────────

async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const [q, chart] = await Promise.all([
      yahooFinance.quote(symbol, {}, { validateResult: false }),
      yahooFinance.chart(symbol, { range: '1d', interval: '5m' }, { validateResult: false }).catch(() => null),
    ])
    if (!q) return null

    const price     = q.regularMarketPrice ?? 0
    const prevClose = q.regularMarketPreviousClose ?? price
    const change    = q.regularMarketChange ?? (price - prevClose)
    const pct       = q.regularMarketChangePercent ?? (prevClose !== 0 ? (change / prevClose) * 100 : 0)

    // Extract closing prices for sparkline — filter nulls
    const quotes = chart?.chart?.result?.[0]?.indicators?.quote?.[0]
    const closes: number[] = quotes?.close?.filter((v: any) => v != null) ?? []

    return {
      symbol:        q.symbol ?? symbol,
      name:          q.shortName || q.longName || symbol,
      price,
      change,
      changePercent: pct,
      open:          q.regularMarketOpen ?? price,
      high:          q.regularMarketDayHigh ?? price,
      low:           q.regularMarketDayLow ?? price,
      volume:        q.regularMarketVolume ?? 0,
      marketCap:     q.marketCap ?? null,
      peRatio:       q.trailingPE ?? null,
      marketState:   (q.marketState ?? 'CLOSED').toLowerCase(),
      points:        closes,
    }
  } catch (e: any) {
    console.error('[stocks] error for', symbol, e?.message)
    return null
  }
}

function formatVolume(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

// ── Router ───────────────────────────────────────────────────────────────────

export function stocksRouter(): Router {
  const router = Router()

  router.get('/stocks/quote', asyncRoute(async (req, res) => {
    const raw = req.query.symbols as string
    if (!raw) throw new AppError(400, 'Missing symbols')

    const symbols = raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 10)
    if (!symbols.length) throw new AppError(400, 'No valid symbols')

    const cacheKey = symbols.join(',')
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const results = await Promise.allSettled(symbols.map(fetchQuote))
    const quotes  = results
      .filter((r): r is PromiseFulfilledResult<StockQuote | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((q): q is StockQuote => q !== null)

    const result = { quotes, fetchedAt: new Date().toISOString() }
    if (quotes.length > 0) setCache(cacheKey, result)
    res.json(result)
  }))

  return router
}
