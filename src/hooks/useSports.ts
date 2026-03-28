import { useQuery } from '@tanstack/react-query'

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

async function fetchScoreboard(sport: string, league: string): Promise<Game[]> {
  const res  = await fetch(`/api/sports/${league}`)
  if (!res.ok) throw new Error('Failed to fetch scores')
  const data = await res.json()
  return (data.events ?? []).map(parseEvent)
}

export function useNFLScores() {
  return useQuery({
    queryKey:      ['sports', 'nfl'],
    queryFn:       () => fetchScoreboard('football', 'nfl'),
    refetchInterval: 60_000,
    staleTime:     30_000,
  })
}

export function useNBAScores() {
  return useQuery({
    queryKey:      ['sports', 'nba'],
    queryFn:       () => fetchScoreboard('basketball', 'nba'),
    refetchInterval: 60_000,
    staleTime:     30_000,
  })
}
