import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { sportsRouter } from './sports.js'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', sportsRouter())
  app.use(errorMiddleware)
  return app
}

const ESPN_SCOREBOARD = {
  events: [
    {
      id:           'evt1',
      shortName:    'LAL vs GSW',
      competitions: [{ competitors: [{ homeAway: 'home', score: '110' }, { homeAway: 'away', score: '105' }] }],
    },
  ],
}

const ESPN_STANDINGS = {
  children: [
    {
      name: 'Eastern Conference',
      standings: {
        entries: [
          {
            team:  { abbreviation: 'BOS', displayName: 'Boston Celtics', logos: [{ href: 'https://img/bos.png' }] },
            stats: [
              { abbreviation: 'W', displayValue: '60' },
              { abbreviation: 'L', displayValue: '20' },
              { abbreviation: 'PCT', displayValue: '.750' },
              { abbreviation: 'GB', displayValue: '-' },
            ],
          },
          {
            team:  { abbreviation: 'MIA', displayName: 'Miami Heat', logos: [] },
            stats: [
              { abbreviation: 'W', displayValue: '40' },
              { abbreviation: 'L', displayValue: '40' },
              { abbreviation: 'PCT', displayValue: '.500' },
              { abbreviation: 'GB', displayValue: '20' },
            ],
          },
        ],
      },
    },
  ],
}

describe('sports routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /sports/:league ──────────────────────────────────────────────────

  it('GET /sports/nba returns scoreboard data', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue(ESPN_SCOREBOARD),
    })

    const res = await request(buildApp()).get('/api/sports/nba')
    expect(res.status).toBe(200)
    expect(res.body.events).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('basketball/nba/scoreboard'))
  })

  it('GET /sports/nfl returns scoreboard data', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue(ESPN_SCOREBOARD),
    })

    const res = await request(buildApp()).get('/api/sports/nfl')
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('football/nfl/scoreboard'))
  })

  it('GET /sports/premierleague returns scoreboard data', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue(ESPN_SCOREBOARD),
    })

    const res = await request(buildApp()).get('/api/sports/premierleague')
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('soccer/eng.1/scoreboard'))
  })

  it('GET /sports/:league returns 400 for unknown league', async () => {
    const res = await request(buildApp()).get('/api/sports/unknownleague')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Unknown league/)
  })

  // ── GET /standings/:league ───────────────────────────────────────────────

  it('GET /standings/nba returns formatted standings', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue(ESPN_STANDINGS),
    })

    const res = await request(buildApp()).get('/api/standings/nba')
    expect(res.status).toBe(200)
    expect(res.body.league).toBe('nba')
    expect(res.body.columns).toEqual(['W', 'L', 'PCT', 'GB'])
    expect(res.body.groups).toHaveLength(1)
    expect(res.body.groups[0].group).toBe('Eastern Conference')
    expect(res.body.groups[0].teams).toHaveLength(2)
    expect(res.body.groups[0].teams[0]).toMatchObject({
      pos:  1,
      team: 'BOS',
      name: 'Boston Celtics',
      w:    '60',
      l:    '20',
    })
  })

  it('GET /standings/premierleague uses soccer columns', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue({
        children: [
          {
            name: 'Premier League',
            standings: {
              entries: [
                {
                  team:  { abbreviation: 'MCI', displayName: 'Manchester City', logos: [] },
                  stats: [
                    { abbreviation: 'GP', displayValue: '30' },
                    { abbreviation: 'W',  displayValue: '22' },
                    { abbreviation: 'D',  displayValue: '5' },
                    { abbreviation: 'L',  displayValue: '3' },
                    { abbreviation: 'GD', displayValue: '45' },
                    { abbreviation: 'P',  displayValue: '71' },
                  ],
                },
              ],
            },
          },
        ],
      }),
    })

    const res = await request(buildApp()).get('/api/standings/premierleague')
    expect(res.status).toBe(200)
    expect(res.body.columns).toEqual(['GP', 'W', 'D', 'L', 'GD', 'P'])
    expect(res.body.groups[0].teams[0].gp).toBe('30')
    expect(res.body.groups[0].teams[0].p).toBe('71')
  })

  it('GET /standings/:league returns 400 for unknown league', async () => {
    const res = await request(buildApp()).get('/api/standings/fakeleague')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Unknown league/)
  })

  it('GET /standings/nhl uses nhl columns', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue({
        standings: {
          entries: [
            {
              team:  { abbreviation: 'NYR', displayName: 'New York Rangers', logos: [] },
              stats: [
                { abbreviation: 'GP',  displayValue: '70' },
                { abbreviation: 'W',   displayValue: '45' },
                { abbreviation: 'L',   displayValue: '20' },
                { abbreviation: 'OTL', displayValue: '5' },
                { abbreviation: 'PTS', displayValue: '95' },
              ],
            },
          ],
        },
      }),
    })

    const res = await request(buildApp()).get('/api/standings/nhl')
    expect(res.status).toBe(200)
    expect(res.body.columns).toEqual(['GP', 'W', 'L', 'OTL', 'PTS'])
  })

  it('GET /standings handles flat standings (no children)', async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue({
        // no children key — flat response
        name: 'MLB',
        standings: {
          entries: [
            {
              team:  { abbreviation: 'NYY', displayName: 'New York Yankees', logos: [] },
              stats: [
                { abbreviation: 'W',   displayValue: '90' },
                { abbreviation: 'L',   displayValue: '72' },
                { abbreviation: 'PCT', displayValue: '.556' },
                { abbreviation: 'GB',  displayValue: '-' },
              ],
            },
          ],
        },
      }),
    })

    const res = await request(buildApp()).get('/api/standings/mlb')
    expect(res.status).toBe(200)
    expect(res.body.groups[0].teams[0].team).toBe('NYY')
  })
})
