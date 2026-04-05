import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { useNFLScores, useNBAScores } from '../../hooks/useSports'
import { Center, FlexCol, FlexRow, Box, ScrollArea } from '../../ui/layouts'
import { Text } from '../../ui/web'
import type { Game } from '../../hooks/useSports'

type League = 'nfl' | 'nba'

interface SportsWidgetSettings {
  league:       League
  favoriteTeam: string
}

const NFL_DEFAULTS: SportsWidgetSettings = { league: 'nfl', favoriteTeam: '' }
const NBA_DEFAULTS: SportsWidgetSettings = { league: 'nba', favoriteTeam: '' }

// ── Logo with per-instance fallback badge ─────────────────────────────────────

function TeamLogo({ logo, abbr, size }: { logo: string | undefined; abbr: string; size: number }) {
  const [imgError, setImgError] = useState(false)

  if (!logo || imgError) {
    return (
      <span
        aria-label={abbr}
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          size,
          height:         size,
          borderRadius:   '50%',
          background:     'var(--wt-surface-raised)',
          color:          'var(--wt-text-muted)',
          fontSize:       Math.max(8, Math.round(size * 0.45)),
          fontWeight:     600,
          flexShrink:     0,
          userSelect:     'none',
        }}
      >
        {abbr.slice(0, 3)}
      </span>
    )
  }

  return (
    <img
      src={logo}
      alt={`${abbr} logo`}
      crossOrigin="anonymous"
      onError={() => setImgError(true)}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

// ── Game row ──────────────────────────────────────────────────────────────────

function GameRow({
  game,
  favoriteTeam,
  containerWidth,
}: {
  game:           Game
  favoriteTeam:   string
  containerWidth: number
}) {
  const isFav   = !!(favoriteTeam && (game.home.abbr === favoriteTeam || game.away.abbr === favoriteTeam))
  const isLive  = game.status === 'in'
  const isFinal = game.status === 'post'
  const isPre   = game.status === 'pre'

  const awayWin = isFinal && Number(game.away.score) > Number(game.home.score)
  const homeWin = isFinal && Number(game.home.score) > Number(game.away.score)

  const showRecords = containerWidth >= 280

  // Responsive logo size driven by containerWidth
  const logoSize = Math.max(18, Math.min(28, Math.round(containerWidth * 0.07)))

  return (
    <FlexRow
      align="center"
      role="listitem"
      className="px-3 py-2 rounded-xl"
      style={{
        gap:        8,
        background: isFav ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'transparent',
        borderLeft: isFav ? '2px solid var(--wt-accent)' : '2px solid transparent',
        minWidth:   0,
      }}
    >
      {/* Away team */}
      <FlexRow
        align="center"
        style={{ flex: 1, gap: 6, minWidth: 0, overflow: 'hidden' }}
      >
        <TeamLogo logo={game.away.logo} abbr={game.away.abbr} size={logoSize} />
        <Text
          variant="label"
          style={{
            fontSize:     'clamp(11px, 3.5cqw, 14px)',
            fontWeight:   awayWin ? 700 : 500,
            opacity:      isFinal && !awayWin ? 0.45 : 1,
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {game.away.abbr}
        </Text>
        {isPre && showRecords && game.away.record && (
          <Text
            variant="caption"
            color="muted"
            style={{
              fontSize:     'clamp(9px, 2.5cqw, 11px)',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              flexShrink:   0,
            }}
          >
            {game.away.record}
          </Text>
        )}
      </FlexRow>

      {/* Score / status */}
      <FlexCol
        align="center"
        style={{ flexShrink: 0, minWidth: 64, gap: 1 }}
      >
        {isPre ? (
          <Text
            variant="caption"
            color="muted"
            style={{
              fontSize:   'clamp(9px, 2.5cqw, 11px)',
              textAlign:  'center',
              whiteSpace: 'nowrap',
            }}
          >
            {game.statusText}
          </Text>
        ) : (
          <FlexRow align="center" style={{ gap: 4 }}>
            <Text
              variant="label"
              style={{
                fontSize:   'clamp(12px, 4cqw, 16px)',
                fontWeight: awayWin ? 700 : 400,
                color:      isLive ? 'var(--wt-danger)' : undefined,
              }}
            >
              {game.away.score}
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 'clamp(9px, 2.5cqw, 11px)' }}>
              —
            </Text>
            <Text
              variant="label"
              style={{
                fontSize:   'clamp(12px, 4cqw, 16px)',
                fontWeight: homeWin ? 700 : 400,
                color:      isLive ? 'var(--wt-danger)' : undefined,
              }}
            >
              {game.home.score}
            </Text>
          </FlexRow>
        )}

        {isLive && (
          <FlexRow align="center" style={{ gap: 4 }}>
            <Box
              style={{
                width:        5,
                height:       5,
                borderRadius: '50%',
                background:   'var(--wt-danger)',
                animation:    'pulse 1.5s infinite',
                flexShrink:   0,
              }}
            />
            <span aria-live="polite">
              <Text
                variant="caption"
                style={{
                  fontSize:   'clamp(9px, 2.5cqw, 11px)',
                  color:      'var(--wt-danger)',
                  whiteSpace: 'nowrap',
                }}
              >
                {game.statusText}
              </Text>
            </span>
          </FlexRow>
        )}

        {isFinal && (
          <Text
            variant="caption"
            color="muted"
            style={{ fontSize: 'clamp(9px, 2.5cqw, 11px)' }}
          >
            Final
          </Text>
        )}
      </FlexCol>

      {/* Home team */}
      <FlexRow
        align="center"
        justify="end"
        style={{ flex: 1, gap: 6, minWidth: 0, overflow: 'hidden' }}
      >
        {isPre && showRecords && game.home.record && (
          <Text
            variant="caption"
            color="muted"
            style={{
              fontSize:     'clamp(9px, 2.5cqw, 11px)',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              flexShrink:   0,
            }}
          >
            {game.home.record}
          </Text>
        )}
        <Text
          variant="label"
          style={{
            fontSize:     'clamp(11px, 3.5cqw, 14px)',
            fontWeight:   homeWin ? 700 : 500,
            opacity:      isFinal && !homeWin ? 0.45 : 1,
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {game.home.abbr}
        </Text>
        <TeamLogo logo={game.home.logo} abbr={game.home.abbr} size={logoSize} />
      </FlexRow>
    </FlexRow>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, isLive }: { label: string; isLive?: boolean }) {
  return (
    <FlexRow
      align="center"
      role="heading"
      aria-level={3}
      className="px-3 pt-3 pb-1"
      style={{ gap: 6 }}
    >
      {isLive && (
        <Box
          style={{
            width:        6,
            height:       6,
            borderRadius: '50%',
            background:   'var(--wt-danger)',
            animation:    'pulse 1.5s infinite',
            flexShrink:   0,
          }}
        />
      )}
      <Text
        variant="caption"
        style={{
          fontSize:      'clamp(9px, 2.5cqw, 11px)',
          fontWeight:    700,
          letterSpacing: '0.08em',
          color:         'var(--wt-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </FlexRow>
  )
}

// ── Widget shell ──────────────────────────────────────────────────────────────

function SportsShell({ league, settings }: { league: League; settings: SportsWidgetSettings }) {
  const nfl = useNFLScores()
  const nba = useNBAScores()
  const { data, isLoading, error } = league === 'nfl' ? nfl : nba

  // ResizeObserver — same pattern as WeatherWidget.tsx
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(340)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const label = league === 'nfl' ? 'NFL' : 'NBA'

  if (isLoading) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="muted">Loading…</Text>
      </Center>
    )
  }
  if (error) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="danger">Failed to load scores</Text>
      </Center>
    )
  }
  if (!data?.length) {
    return (
      <Center fullHeight>
        <Text variant="caption" color="muted">No games today</Text>
      </Center>
    )
  }

  // Sort within each status group: favorite team's game first
  const sortWithinGroup = (games: Game[]): Game[] => {
    const fav = settings.favoriteTeam
    if (!fav) return games
    return [...games].sort((a, b) => {
      const aIsFav = a.home.abbr === fav || a.away.abbr === fav ? -1 : 0
      const bIsFav = b.home.abbr === fav || b.away.abbr === fav ? -1 : 0
      return aIsFav - bIsFav
    })
  }

  // Split into three groups
  const liveGames     = sortWithinGroup(data.filter(g => g.status === 'in'))
  const upcomingGames = sortWithinGroup(data.filter(g => g.status === 'pre'))
  const finalGames    = sortWithinGroup(data.filter(g => g.status === 'post'))

  const liveCount = liveGames.length
  const totalCount = data.length

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--wt-text)', minWidth: 0 }}
    >
      {/* Header */}
      <FlexRow
        align="center"
        className="px-3 pt-3 pb-2 flex-shrink-0"
        style={{ gap: 8 }}
      >
        <Text
          variant="label"
          style={{
            fontSize:      'clamp(9px, 2.5cqw, 11px)',
            fontWeight:    700,
            letterSpacing: '0.08em',
            color:         'var(--wt-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Box style={{ flex: 1, height: 1, background: 'var(--wt-border)' }} />
        <Text variant="caption" color="muted" style={{ fontSize: 'clamp(9px, 2.5cqw, 11px)' }}>
          {liveCount > 0 ? `${liveCount} live` : `${totalCount} games`}
        </Text>
      </FlexRow>

      <ScrollArea style={{ flex: 1 }}>
        <div role="list" style={{ paddingBottom: 8 }}>
          {/* Live section */}
          {liveGames.length > 0 && (
            <>
              <SectionHeader label="Live" isLive />
              {liveGames.map(game => (
                <GameRow
                  key={game.id}
                  game={game}
                  favoriteTeam={settings.favoriteTeam}
                  containerWidth={containerWidth}
                />
              ))}
            </>
          )}

          {/* Upcoming section */}
          {upcomingGames.length > 0 && (
            <>
              <SectionHeader label="Upcoming" />
              {upcomingGames.map(game => (
                <GameRow
                  key={game.id}
                  game={game}
                  favoriteTeam={settings.favoriteTeam}
                  containerWidth={containerWidth}
                />
              ))}
            </>
          )}

          {/* Final section */}
          {finalGames.length > 0 && (
            <>
              <SectionHeader label="Final" />
              {finalGames.map(game => (
                <GameRow
                  key={game.id}
                  game={game}
                  favoriteTeam={settings.favoriteTeam}
                  containerWidth={containerWidth}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Public exports (signatures unchanged) ─────────────────────────────────────

export function NFLWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<SportsWidgetSettings>(widgetId, NFL_DEFAULTS)
  return <SportsShell league="nfl" settings={settings} />
}

export function NBAWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<SportsWidgetSettings>(widgetId, NBA_DEFAULTS)
  return <SportsShell league="nba" settings={settings} />
}
