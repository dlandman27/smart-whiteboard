import { useQuery } from '@tanstack/react-query'

// ── Types ─────────────────────────────────────────────────────────────────────

export type League = 'nfl' | 'nba' | 'nhl' | 'mlb' | 'premierleague' | 'laliga' | 'ucl' | 'bundesliga' | 'seriea' | 'ligue1' | 'mls'

export interface GameTeam {
  abbr:    string
  name:    string
  score:   string
  homeAway: 'home' | 'away'
  logo?:   string
  record?: string
}

export interface Game {
  id:          string
  status:      'pre' | 'in' | 'post'
  statusText:  string
  detail:      string
  home:        GameTeam
  away:        GameTeam
}

export interface StandingsTeam {
  pos:   number
  team:  string
  name:  string
  logo:  string
  [stat: string]: string | number  // dynamic stat columns
}

export interface StandingsGroup {
  group: string
  teams: StandingsTeam[]
}

export interface StandingsData {
  league:  string
  columns: string[]
  groups:  StandingsGroup[]
}

// ── Scores ────────────────────────────────────────────────────────────────────

function parseEvent(event: any): Game {
  const comp        = event.competitions?.[0]
  const statusType  = comp?.status?.type
  const competitors = (comp?.competitors ?? []) as any[]

  const home = competitors.find((c: any) => c.homeAway === 'home')
  const away = competitors.find((c: any) => c.homeAway === 'away')

  function toTeam(c: any): GameTeam {
    return {
      abbr:     c?.team?.abbreviation ?? '?',
      name:     c?.team?.displayName  ?? '?',
      score:    c?.score ?? '0',
      homeAway: c?.homeAway,
      logo:     c?.team?.logo,
      record:   c?.records?.[0]?.summary,
    }
  }

  return {
    id:         event.id,
    status:     statusType?.state === 'post' ? 'post' : statusType?.state === 'in' ? 'in' : 'pre',
    statusText: statusType?.shortDetail ?? '',
    detail:     statusType?.detail ?? '',
    home:       toTeam(home),
    away:       toTeam(away),
  }
}

async function fetchScoreboard(league: string): Promise<Game[]> {
  const res  = await fetch(`/api/sports/${league}`)
  if (!res.ok) throw new Error('Failed to fetch scores')
  const data = await res.json()
  return (data.events ?? []).map(parseEvent)
}

// ── Standings ─────────────────────────────────────────────────────────────────

async function fetchStandings(league: string): Promise<StandingsData> {
  const res = await fetch(`/api/standings/${league}`)
  if (!res.ok) throw new Error('Failed to fetch standings')
  return res.json()
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useScores(league: League) {
  return useQuery({
    queryKey:       ['sports', league],
    queryFn:        () => fetchScoreboard(league),
    refetchInterval: 60_000,
    staleTime:      30_000,
  })
}

export function useStandings(league: League) {
  return useQuery({
    queryKey:       ['standings', league],
    queryFn:        () => fetchStandings(league),
    staleTime:      5 * 60_000,  // standings don't change as fast
  })
}

// Keep old hooks for backwards compat
export function useNFLScores() { return useScores('nfl') }
export function useNBAScores() { return useScores('nba') }
