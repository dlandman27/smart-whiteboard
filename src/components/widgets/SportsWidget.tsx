import { useWidgetSettings } from '@whiteboard/sdk'
import { useScores, useStandings, type League, type Game, type StandingsGroup } from '../../hooks/useSports'
import {
  Center, FlexCol, FlexRow, Box, ScrollArea, Container, Text, SegmentedControl,
} from '@whiteboard/ui-kit'

// ── Types ─────────────────────────────────────────────────────────────────────

type View = 'scores' | 'standings'

interface SportsWidgetSettings {
  league:       League
  view:         View
  favoriteTeam: string
}

// ── Game row ──────────────────────────────────────────────────────────────────

function GameRow({ game, favoriteTeam }: { game: Game; favoriteTeam: string }) {
  const isFav     = favoriteTeam && (game.home.abbr === favoriteTeam || game.away.abbr === favoriteTeam)
  const isLive    = game.status === 'in'
  const isFinal   = game.status === 'post'
  const isPre     = game.status === 'pre'

  const awayWin = isFinal && Number(game.away.score) > Number(game.home.score)
  const homeWin = isFinal && Number(game.home.score) > Number(game.away.score)

  return (
    <div
      className="px-3 py-2.5 rounded-xl"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 8,
        background: isFav ? 'color-mix(in srgb, var(--wt-accent) 8%, transparent)' : 'transparent',
        borderLeft: isFav ? '2px solid var(--wt-accent)' : '2px solid transparent',
      }}
    >
      {/* Away team (left-aligned) */}
      <FlexRow align="center" style={{ gap: 6, minWidth: 0 }}>
        {game.away.logo && (
          <img src={game.away.logo} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
        )}
        <Text
          variant="label"
          numberOfLines={1}
          style={{
            fontSize:   13,
            fontWeight: awayWin ? 700 : 500,
            opacity:    isFinal && !awayWin ? 0.45 : 1,
          }}
        >
          {game.away.abbr}
        </Text>
      </FlexRow>

      {/* Center: score or time */}
      <FlexCol align="center" style={{ minWidth: 80, gap: 1 }}>
        {isPre ? (
          <Text variant="caption" color="muted" size="small" align="center">
            {game.statusText}
          </Text>
        ) : (
          <FlexRow align="center" justify="center" style={{ gap: 8 }}>
            <Text variant="label" style={{ fontSize: 15, fontWeight: awayWin ? 700 : 400, minWidth: 24, textAlign: 'right' }}>
              {game.away.score}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 11 }}>–</Text>
            <Text variant="label" style={{ fontSize: 15, fontWeight: homeWin ? 700 : 400, minWidth: 24, textAlign: 'left' }}>
              {game.home.score}
            </Text>
          </FlexRow>
        )}
        {isLive && (
          <FlexRow align="center" justify="center" style={{ gap: 4 }}>
            <Box style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--wt-danger)', animation: 'pulse 1.5s infinite' }} />
            <Text variant="caption" style={{ fontSize: 10, color: 'var(--wt-danger)' }}>
              {game.statusText}
            </Text>
          </FlexRow>
        )}
        {isFinal && (
          <Text variant="caption" color="muted" style={{ fontSize: 10 }}>Final</Text>
        )}
      </FlexCol>

      {/* Home team (right-aligned) */}
      <FlexRow align="center" justify="end" style={{ gap: 6, minWidth: 0 }}>
        <Text
          variant="label"
          numberOfLines={1}
          style={{
            fontSize:   13,
            fontWeight: homeWin ? 700 : 500,
            opacity:    isFinal && !homeWin ? 0.45 : 1,
          }}
        >
          {game.home.abbr}
        </Text>
        {game.home.logo && (
          <img src={game.home.logo} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
        )}
      </FlexRow>
    </div>
  )
}

// ── Scores view ───────────────────────────────────────────────────────────────

function ScoresView({ league, favoriteTeam }: { league: League; favoriteTeam: string }) {
  const { data, isLoading, error } = useScores(league)

  if (isLoading) return <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
  if (error)     return <Center fullHeight><Text variant="caption" color="danger">Failed to load scores</Text></Center>
  if (!data?.length) return <Center fullHeight><Text variant="caption" color="muted">No games today</Text></Center>

  const sorted = [...data].sort((a, b) => {
    const order = { in: 0, pre: 1, post: 2 }
    return order[a.status] - order[b.status]
  })

  return (
    <ScrollArea style={{ flex: 1 }}>
      <FlexCol style={{ gap: 2, paddingBottom: 8 }}>
        {sorted.map((game) => (
          <GameRow key={game.id} game={game} favoriteTeam={favoriteTeam} />
        ))}
      </FlexCol>
    </ScrollArea>
  )
}

// ── Standings view ────────────────────────────────────────────────────────────

function StandingsTable({ group, columns, favoriteTeam }: {
  group:        StandingsGroup
  columns:      string[]
  favoriteTeam: string
}) {
  return (
    <FlexCol style={{ gap: 0 }}>
      {group.group && (
        <FlexRow align="center" className="px-3 py-1.5" style={{ gap: 8 }}>
          <Text variant="caption" color="muted" size="small" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {group.group}
          </Text>
          <Box style={{ flex: 1, height: 1, background: 'var(--wt-border)' }} />
        </FlexRow>
      )}

      {/* Column header */}
      <div
        className="px-3 py-1"
        style={{
          display: 'grid',
          gridTemplateColumns: `20px 1fr ${columns.map(() => '32px').join(' ')}`,
          gap: 4,
          alignItems: 'center',
        }}
      >
        <Text variant="caption" color="muted" size="small" style={{ textAlign: 'center' }}>#</Text>
        <Text variant="caption" color="muted" size="small">Team</Text>
        {columns.map((col) => (
          <Text key={col} variant="caption" color="muted" size="small" style={{ textAlign: 'center' }}>
            {col}
          </Text>
        ))}
      </div>

      {/* Rows */}
      {group.teams.map((team) => {
        const isFav = favoriteTeam && team.team === favoriteTeam
        return (
          <div
            key={team.team}
            className="px-3 py-1.5 rounded-lg"
            style={{
              display: 'grid',
              gridTemplateColumns: `20px 1fr ${columns.map(() => '32px').join(' ')}`,
              gap: 4,
              alignItems: 'center',
              background: isFav ? 'color-mix(in srgb, var(--wt-accent) 8%, transparent)' : 'transparent',
            }}
          >
            <Text variant="caption" color="muted" size="small" style={{ textAlign: 'center' }}>
              {team.pos}
            </Text>
            <FlexRow align="center" style={{ gap: 5, minWidth: 0 }}>
              {team.logo && (
                <img src={team.logo} style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <Text variant="label" size="small" numberOfLines={1} style={{ fontWeight: isFav ? 600 : 400 }}>
                {team.team}
              </Text>
            </FlexRow>
            {columns.map((col) => (
              <Text key={col} variant="caption" size="small" style={{ textAlign: 'center' }}>
                {(team as any)[col.toLowerCase()] ?? '-'}
              </Text>
            ))}
          </div>
        )
      })}
    </FlexCol>
  )
}

function StandingsView({ league, favoriteTeam }: { league: League; favoriteTeam: string }) {
  const { data, isLoading, error } = useStandings(league)

  if (isLoading) return <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
  if (error)     return <Center fullHeight><Text variant="caption" color="danger">Failed to load standings</Text></Center>
  if (!data?.groups?.length) return <Center fullHeight><Text variant="caption" color="muted">No standings available</Text></Center>

  return (
    <ScrollArea style={{ flex: 1 }}>
      <FlexCol style={{ gap: 8, paddingBottom: 8 }}>
        {data.groups.map((group) => (
          <StandingsTable
            key={group.group}
            group={group}
            columns={data.columns}
            favoriteTeam={favoriteTeam}
          />
        ))}
      </FlexCol>
    </ScrollArea>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

const LEAGUE_LABELS: Record<League, string> = {
  nfl:           'NFL',
  nba:           'NBA',
  nhl:           'NHL',
  mlb:           'MLB',
  premierleague: 'Premier League',
  laliga:        'La Liga',
  ucl:           'Champions League',
  bundesliga:    'Bundesliga',
  seriea:        'Serie A',
  ligue1:        'Ligue 1',
  mls:           'MLS',
}

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'scores',    label: 'Scores' },
  { value: 'standings', label: 'Standings' },
]

function SportsContent({ widgetId, league }: { widgetId: string; league: League }) {
  const [settings, setSettings] = useWidgetSettings<SportsWidgetSettings>(widgetId, {
    league,
    view: 'scores',
    favoriteTeam: '',
  })
  const view = settings.view ?? 'scores'

  return (
    <FlexCol fullHeight style={{ color: 'var(--wt-text)' }}>
      {/* Header */}
      <FlexCol className="px-3 pt-3 pb-2 flex-shrink-0" style={{ gap: 8 }}>
        <FlexRow align="center" style={{ gap: 8 }}>
          <Text variant="label" size="small" color="muted" textTransform="uppercase" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            {LEAGUE_LABELS[league]}
          </Text>
          <Box style={{ flex: 1, height: 1, background: 'var(--wt-border)' }} />
        </FlexRow>
        <SegmentedControl
          value={view}
          options={VIEW_OPTIONS}
          onChange={(v) => setSettings({ view: v })}
        />
      </FlexCol>

      {/* Content */}
      {view === 'scores' && (
        <ScoresView league={league} favoriteTeam={settings.favoriteTeam} />
      )}
      {view === 'standings' && (
        <StandingsView league={league} favoriteTeam={settings.favoriteTeam} />
      )}
    </FlexCol>
  )
}

// ── Scores-only variant ──────────────────────────────────────────────────────

function ScoresOnlyContent({ widgetId, league }: { widgetId: string; league: League }) {
  const [settings] = useWidgetSettings<SportsWidgetSettings>(widgetId, {
    league, view: 'scores', favoriteTeam: '',
  })
  return (
    <FlexCol fullHeight style={{ color: 'var(--wt-text)' }}>
      <FlexCol className="px-3 pt-3 pb-2 flex-shrink-0">
        <FlexRow align="center" style={{ gap: 8 }}>
          <Text variant="label" size="small" color="muted" textTransform="uppercase" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            {LEAGUE_LABELS[league]} Scores
          </Text>
          <Box style={{ flex: 1, height: 1, background: 'var(--wt-border)' }} />
        </FlexRow>
      </FlexCol>
      <ScoresView league={league} favoriteTeam={settings.favoriteTeam} />
    </FlexCol>
  )
}

// ── Standings-only variant ───────────────────────────────────────────────────

function StandingsOnlyContent({ widgetId, league }: { widgetId: string; league: League }) {
  const [settings] = useWidgetSettings<SportsWidgetSettings>(widgetId, {
    league, view: 'standings', favoriteTeam: '',
  })
  return (
    <FlexCol fullHeight style={{ color: 'var(--wt-text)' }}>
      <FlexCol className="px-3 pt-3 pb-2 flex-shrink-0">
        <FlexRow align="center" style={{ gap: 8 }}>
          <Text variant="label" size="small" color="muted" textTransform="uppercase" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            {LEAGUE_LABELS[league]} Standings
          </Text>
          <Box style={{ flex: 1, height: 1, background: 'var(--wt-border)' }} />
        </FlexRow>
      </FlexCol>
      <StandingsView league={league} favoriteTeam={settings.favoriteTeam} />
    </FlexCol>
  )
}

// ── Exported widgets ──────────────────────────────────────────────────────────

// Combined (legacy default variant)
export function NFLWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="nfl" /></Container>
}
export function NBAWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="nba" /></Container>
}
export function NHLWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="nhl" /></Container>
}
export function MLBWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="mlb" /></Container>
}

// Scores variants
export function NFLScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="nfl" /></Container>
}
export function NBAScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="nba" /></Container>
}
export function NHLScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="nhl" /></Container>
}
export function MLBScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="mlb" /></Container>
}

// Standings variants
export function NFLStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="nfl" /></Container>
}
export function NBAStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="nba" /></Container>
}
export function NHLStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="nhl" /></Container>
}
export function MLBStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="mlb" /></Container>
}

// ── Soccer leagues ───────────────────────────────────────────────────────────

// Premier League
export function EPLWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="premierleague" /></Container>
}
export function EPLScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="premierleague" /></Container>
}
export function EPLStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="premierleague" /></Container>
}

// La Liga
export function LaLigaWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="laliga" /></Container>
}
export function LaLigaScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="laliga" /></Container>
}
export function LaLigaStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="laliga" /></Container>
}

// Champions League
export function UCLWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="ucl" /></Container>
}
export function UCLScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="ucl" /></Container>
}
export function UCLStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="ucl" /></Container>
}

// Bundesliga
export function BundesligaWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="bundesliga" /></Container>
}
export function BundesligaScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="bundesliga" /></Container>
}
export function BundesligaStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="bundesliga" /></Container>
}

// Serie A
export function SerieAWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="seriea" /></Container>
}
export function SerieAScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="seriea" /></Container>
}
export function SerieAStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="seriea" /></Container>
}

// Ligue 1
export function Ligue1Widget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="ligue1" /></Container>
}
export function Ligue1ScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="ligue1" /></Container>
}
export function Ligue1StandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="ligue1" /></Container>
}

// MLS
export function MLSWidget({ widgetId }: { widgetId: string }) {
  return <Container><SportsContent widgetId={widgetId} league="mls" /></Container>
}
export function MLSScoresWidget({ widgetId }: { widgetId: string }) {
  return <Container><ScoresOnlyContent widgetId={widgetId} league="mls" /></Container>
}
export function MLSStandingsWidget({ widgetId }: { widgetId: string }) {
  return <Container><StandingsOnlyContent widgetId={widgetId} league="mls" /></Container>
}
