import { useWidgetSettings } from '@whiteboard/sdk'
import { useNFLScores, useNBAScores } from '../../hooks/useSports'
import { Center, FlexCol, FlexRow, Box, ScrollArea, Container } from '@whiteboard/ui-kit'
import { Text } from '@whiteboard/ui-kit'
import type { Game } from '../../hooks/useSports'

type League = 'nfl' | 'nba'

interface SportsWidgetSettings {
  league:       League
  favoriteTeam: string
}

const NFL_DEFAULTS: SportsWidgetSettings = { league: 'nfl', favoriteTeam: '' }
const NBA_DEFAULTS: SportsWidgetSettings = { league: 'nba', favoriteTeam: '' }

// ── Game row ──────────────────────────────────────────────────────────────────

function GameRow({ game, favoriteTeam }: { game: Game; favoriteTeam: string }) {
  const isFav     = favoriteTeam && (game.home.abbr === favoriteTeam || game.away.abbr === favoriteTeam)
  const isLive    = game.status === 'in'
  const isFinal   = game.status === 'post'
  const isPre     = game.status === 'pre'

  const awayWin = isFinal && Number(game.away.score) > Number(game.home.score)
  const homeWin = isFinal && Number(game.home.score) > Number(game.away.score)

  return (
    <FlexRow
      align="center"
      className="px-3 py-2 rounded-xl"
      style={{
        gap:        8,
        background: isFav ? 'color-mix(in srgb, var(--wt-accent) 8%, transparent)' : 'transparent',
        borderLeft: isFav ? '2px solid var(--wt-accent)' : '2px solid transparent',
      }}
    >
      {/* Away */}
      <FlexRow align="center" style={{ flex: 1, gap: 6, minWidth: 0 }}>
        {game.away.logo && (
          <img src={game.away.logo} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
        )}
        <Text
          variant="label"
          style={{
            fontSize:   13,
            fontWeight: awayWin ? 700 : 500,
            opacity:    isFinal && !awayWin ? 0.45 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {game.away.abbr}
        </Text>
        {isPre && game.away.record && (
          <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
            {game.away.record}
          </Text>
        )}
      </FlexRow>

      {/* Score / status */}
      <FlexCol align="center" style={{ flexShrink: 0, minWidth: 70, gap: 1 }}>
        {isPre ? (
          <Text variant="caption" color="muted" style={{ fontSize: 11, textAlign: 'center' }}>
            {game.statusText}
          </Text>
        ) : (
          <FlexRow align="center" style={{ gap: 6 }}>
            <Text variant="label" style={{ fontSize: 15, fontWeight: awayWin ? 700 : 400 }}>
              {game.away.score}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 11 }}>—</Text>
            <Text variant="label" style={{ fontSize: 15, fontWeight: homeWin ? 700 : 400 }}>
              {game.home.score}
            </Text>
          </FlexRow>
        )}
        {isLive && (
          <FlexRow align="center" style={{ gap: 4 }}>
            <Box style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
            <Text variant="caption" style={{ fontSize: 10, color: '#ef4444' }}>
              {game.statusText}
            </Text>
          </FlexRow>
        )}
        {isFinal && (
          <Text variant="caption" color="muted" style={{ fontSize: 10 }}>Final</Text>
        )}
      </FlexCol>

      {/* Home */}
      <FlexRow align="center" justify="end" style={{ flex: 1, gap: 6, minWidth: 0 }}>
        {isPre && game.home.record && (
          <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
            {game.home.record}
          </Text>
        )}
        <Text
          variant="label"
          style={{
            fontSize:   13,
            fontWeight: homeWin ? 700 : 500,
            opacity:    isFinal && !homeWin ? 0.45 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {game.home.abbr}
        </Text>
        {game.home.logo && (
          <img src={game.home.logo} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
        )}
      </FlexRow>
    </FlexRow>
  )
}

// ── Widget shell ──────────────────────────────────────────────────────────────

function SportsShell({ league, settings }: { league: League; settings: SportsWidgetSettings }) {
  const nfl = useNFLScores()
  const nba = useNBAScores()
  const { data, isLoading, error } = league === 'nfl' ? nfl : nba

  const label = league === 'nfl' ? 'NFL' : 'NBA'

  if (isLoading) return <Center fullHeight><Text variant="caption" color="muted">Loading…</Text></Center>
  if (error)     return <Center fullHeight><Text variant="caption" color="danger">Failed to load scores</Text></Center>
  if (!data?.length) return <Center fullHeight><Text variant="caption" color="muted">No games today</Text></Center>

  // Sort: live first, then scheduled, then final
  const sorted = [...data].sort((a, b) => {
    const order = { in: 0, pre: 1, post: 2 }
    return order[a.status] - order[b.status]
  })

  return (
    <FlexCol fullHeight style={{ color: 'var(--wt-text)' }}>
      {/* Header */}
      <FlexRow align="center" className="px-3 pt-3 pb-2 flex-shrink-0" style={{ gap: 8 }}>
        <Text variant="label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--wt-text-muted)', textTransform: 'uppercase' }}>
          {label}
        </Text>
        <Box style={{ flex: 1, height: 1, background: 'var(--wt-border)' }} />
        <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
          {sorted.filter(g => g.status === 'in').length > 0 ? `${sorted.filter(g => g.status === 'in').length} live` : `${sorted.length} games`}
        </Text>
      </FlexRow>

      <ScrollArea style={{ flex: 1 }}>
        <FlexCol style={{ gap: 2, paddingBottom: 8 }}>
          {sorted.map((game) => (
            <GameRow key={game.id} game={game} favoriteTeam={settings.favoriteTeam} />
          ))}
        </FlexCol>
      </ScrollArea>
    </FlexCol>
  )
}

export function NFLWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<SportsWidgetSettings>(widgetId, NFL_DEFAULTS)
  return <Container><SportsShell league="nfl" settings={settings} /></Container>
}

export function NBAWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<SportsWidgetSettings>(widgetId, NBA_DEFAULTS)
  return <Container><SportsShell league="nba" settings={settings} /></Container>
}
