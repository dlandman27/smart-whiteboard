import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'

const ESPN_URLS: Record<string, string> = {
  nfl:           'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nba:           'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  premierleague: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
  laliga:        'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard',
  ucl:           'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
  mlb:           'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  nhl:           'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
}

const ESPN_STANDINGS_IDS: Record<string, string> = {
  premierleague: 'eng.1',
  epl:           'eng.1',
  laliga:        'esp.1',
  ucl:           'uefa.champions',
  bundesliga:    'ger.1',
  seriea:        'ita.1',
  ligue1:        'fra.1',
  mls:           'usa.1',
}

export function sportsRouter(): Router {
  const router = Router()

  router.get('/standings/:league', asyncRoute(async (req, res) => {
    const leagueId = ESPN_STANDINGS_IDS[req.params.league]
    if (!leagueId) throw new AppError(400, 'Unknown league')
    const r = await fetch(`https://site.web.api.espn.com/apis/v2/sports/soccer/${leagueId}/standings`)
    const d = await r.json() as any
    const entries = d?.children?.[0]?.standings?.entries ?? []
    const table = entries.map((e: any, i: number) => ({
      pos:  i + 1,
      team: e.team?.displayName ?? '',
      gp:   e.stats?.find((s: any) => s.abbreviation === 'GP')?.displayValue ?? '-',
      w:    e.stats?.find((s: any) => s.abbreviation === 'W')?.displayValue  ?? '-',
      d:    e.stats?.find((s: any) => s.abbreviation === 'D')?.displayValue  ?? '-',
      l:    e.stats?.find((s: any) => s.abbreviation === 'L')?.displayValue  ?? '-',
      gd:   e.stats?.find((s: any) => s.abbreviation === 'GD')?.displayValue ?? '-',
      pts:  e.stats?.find((s: any) => s.abbreviation === 'P')?.displayValue  ?? '-',
    }))
    res.json({ league: req.params.league, table })
  }))

  router.get('/sports/:league', asyncRoute(async (req, res) => {
    const url = ESPN_URLS[req.params.league]
    if (!url) throw new AppError(400, 'Unknown league')
    const r = await fetch(url)
    res.json(await r.json())
  }))

  return router
}
