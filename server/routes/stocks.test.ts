import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { stocksRouter } from './stocks.js'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', stocksRouter())
  app.use(errorMiddleware)
  return app
}

function yahooChartResponse(symbol: string, price: number, prevClose: number) {
  return {
    ok:   true,
    json: vi.fn().mockResolvedValue({
      chart: {
        result: [
          {
            meta: {
              symbol,
              shortName:          symbol + ' Inc',
              regularMarketPrice: price,
              chartPreviousClose: prevClose,
              marketState:        'REGULAR',
            },
          },
        ],
      },
    }),
    text: vi.fn().mockResolvedValue(''),
  }
}

describe('stocks routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /stocks/quote returns 400 when symbols param is missing', async () => {
    const res = await request(buildApp()).get('/api/stocks/quote')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/symbols/)
  })

  it('GET /stocks/quote returns 400 for empty symbols after trim', async () => {
    const res = await request(buildApp()).get('/api/stocks/quote?symbols=%20,%20')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/No valid symbols/)
  })

  it('GET /stocks/quote fetches and returns a single quote', async () => {
    mockFetch.mockResolvedValue(yahooChartResponse('AAPL', 200, 190))

    const res = await request(buildApp()).get('/api/stocks/quote?symbols=AAPL')
    expect(res.status).toBe(200)
    expect(res.body.quotes).toHaveLength(1)
    expect(res.body.quotes[0]).toMatchObject({
      symbol: 'AAPL',
      price:  200,
    })
    expect(res.body.quotes[0].change).toBeCloseTo(10)
    expect(res.body.quotes[0].changePercent).toBeCloseTo((10 / 190) * 100)
    expect(res.body.fetchedAt).toBeTruthy()
  })

  it('GET /stocks/quote normalises symbols to uppercase', async () => {
    mockFetch.mockResolvedValue(yahooChartResponse('TSLA', 250, 240))

    const res = await request(buildApp()).get('/api/stocks/quote?symbols=tsla')
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('TSLA'),
      expect.any(Object),
    )
  })

  it('GET /stocks/quote fetches multiple symbols', async () => {
    mockFetch
      .mockResolvedValueOnce(yahooChartResponse('AAPL', 200, 190))
      .mockResolvedValueOnce(yahooChartResponse('GOOG', 150, 145))

    const res = await request(buildApp()).get('/api/stocks/quote?symbols=AAPL,GOOG')
    expect(res.status).toBe(200)
    expect(res.body.quotes).toHaveLength(2)
  })

  it('GET /stocks/quote caps at 20 symbols', async () => {
    // 25 symbols provided — only 20 should be requested
    const symbols = Array.from({ length: 25 }, (_, i) => `SYM${i}`).join(',')

    mockFetch.mockResolvedValue({
      ok:   false,
      status: 404,
      text: vi.fn().mockResolvedValue('not found'),
    })

    await request(buildApp()).get(`/api/stocks/quote?symbols=${symbols}`)
    // Max 20 fetch calls (one per symbol via Promise.allSettled)
    expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(20)
  })

  it('GET /stocks/quote returns empty quotes when all fetches fail (no cache)', async () => {
    mockFetch.mockResolvedValue({
      ok:     false,
      status: 401,
      text:   vi.fn().mockResolvedValue('Unauthorized'),
    })

    const res = await request(buildApp()).get('/api/stocks/quote?symbols=FAIL')
    expect(res.status).toBe(200)
    expect(res.body.quotes).toHaveLength(0)
  })

  it('GET /stocks/quote serves cached result on second request', async () => {
    mockFetch.mockResolvedValue(yahooChartResponse('MSFT', 300, 295))

    const url = '/api/stocks/quote?symbols=MSFT'
    const app = buildApp()
    await request(app).get(url)
    await request(app).get(url)
    // fetch called only once (second hits cache)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('GET /stocks/quote handles symbol with meta marketState casing', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue({
        chart: {
          result: [{
            meta: {
              symbol:             'SPY',
              shortName:          'SPDR S&P 500',
              regularMarketPrice: 500,
              chartPreviousClose: 498,
              marketState:        'PRE_MARKET',
            },
          }],
        },
      }),
      text: vi.fn().mockResolvedValue(''),
    })

    const res = await request(buildApp()).get('/api/stocks/quote?symbols=SPY')
    expect(res.status).toBe(200)
    expect(res.body.quotes[0].marketState).toBe('pre-market')
  })
})
