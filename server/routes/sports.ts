import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'

const ESPN_URLS: Record<string, string> = {
  nfl:           'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nba:           'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  nhl:           'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  mlb:           'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  premierleague: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
  laliga:        'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard',
  ucl:           'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
  bundesliga:    'https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard',
  seriea:        'https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard',
  ligue1:        'https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard',
  mls:           'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
}

// ESPN standings API paths by league
const ESPN_STANDINGS: Record<string, { sport: string; league: string }> = {
  nfl:           { sport: 'football/nfl',      league: 'nfl'           },
  nba:           { sport: 'basketball/nba',    league: 'nba'           },
  nhl:           { sport: 'hockey/nhl',        league: 'nhl'           },
  mlb:           { sport: 'baseball/mlb',      league: 'mlb'           },
  premierleague: { sport: 'soccer/eng.1',      league: 'eng.1'        },
  epl:           { sport: 'soccer/eng.1',      league: 'eng.1'        },
  laliga:        { sport: 'soccer/esp.1',      league: 'esp.1'        },
  ucl:           { sport: 'soccer/uefa.champions', league: 'uefa.champions' },
  bundesliga:    { sport: 'soccer/ger.1',      league: 'ger.1'        },
  seriea:        { sport: 'soccer/ita.1',      league: 'ita.1'        },
  ligue1:        { sport: 'soccer/fra.1',      league: 'fra.1'        },
  mls:           { sport: 'soccer/usa.1',      league: 'usa.1'        },
}

// Stats abbreviations differ by sport
const STAT_COLS: Record<string, string[]> = {
  soccer: ['GP', 'W', 'D', 'L', 'GD', 'P'],
  nfl:    ['W', 'L', 'T', 'PCT'],
  nba:    ['W', 'L', 'PCT', 'GB'],
  nhl:    ['GP', 'W', 'L', 'OTL', 'PTS'],
  mlb:    ['W', 'L', 'PCT', 'GB'],
}

function getSportType(league: string): string {
  if (['nfl'].includes(league))  return 'nfl'
  if (['nba'].includes(league))  return 'nba'
  if (['nhl'].includes(league))  return 'nhl'
  if (['mlb'].includes(league))  return 'mlb'
  return 'soccer'
}

export function sportsRouter(): Router {
  const router = Router()

  // ── Standings ────────────────────────────────────────────────────────────
  router.get('/standings/:league', asyncRoute(async (req, res) => {
    const cfg = ESPN_STANDINGS[req.params.league]
    if (!cfg) throw new AppError(400, 'Unknown league')

    const url = `https://site.web.api.espn.com/apis/v2/sports/${cfg.sport}/standings`
    const r = await fetch(url)
    const d = await r.json() as any

    const sportType = getSportType(req.params.league)
    const cols = STAT_COLS[sportType] ?? STAT_COLS.soccer

    // ESPN returns children[] for conferences/divisions, or a flat standings
    const groups = d?.children ?? [d]
    const result: any[] = []

    for (const group of groups) {
      const groupName = group?.name ?? group?.abbreviation ?? ''
      const entries = group?.standings?.entries ?? []

      const teams = entries.map((e: any, i: number) => {
        const stats: Record<string, string> = {}
        for (const col of cols) {
          stats[col.toLowerCase()] = e.stats?.find((s: any) => s.abbreviation === col)?.displayValue ?? '-'
        }
        return {
          pos:  i + 1,
          team: e.team?.abbreviation ?? e.team?.displayName ?? '',
          name: e.team?.displayName ?? '',
          logo: e.team?.logos?.[0]?.href ?? '',
          ...stats,
        }
      })

      result.push({ group: groupName, teams })
    }

    res.json({ league: req.params.league, columns: cols, groups: result })
  }))

  // ── Scores ───────────────────────────────────────────────────────────────
  router.get('/sports/:league', asyncRoute(async (req, res) => {
    const url = ESPN_URLS[req.params.league]
    if (!url) throw new AppError(400, 'Unknown league')
    const r = await fetch(url)
    res.json(await r.json())
  }))

  return router
}
