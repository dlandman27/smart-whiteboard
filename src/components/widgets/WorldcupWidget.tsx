
import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import { FlexCol, FlexRow, Center, ScrollArea, Box } from '@whiteboard/ui-kit'
import { Text } from '@whiteboard/ui-kit'

// ── ESPN API ──────────────────────────────────────────────────────────────────

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

async function fetchGames() {
  const res = await fetch(ESPN_BASE)
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`)
  return res.json()
}

async function fetchGameDetail(gameId: string) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${gameId}`
  )
  if (!res.ok) throw new Error(`ESPN detail error: ${res.status}`)
  return res.json()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatKickoff(isoDate: string) {
  const d = new Date(isoDate)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (isToday) return `Today · ${time}`
  if (isTomorrow) return `Tomorrow · ${time}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + time
}

function getStatusLabel(event: any) {
  const status = event?.status
  const type = status?.type
  if (!type) return ''
  if (type.completed) return 'FT'
  if (type.state === 'in') {
    const detail = status?.displayClock ?? ''
    return detail || 'LIVE'
  }
  return ''
}

function isLive(event: any) {
  return event?.status?.type?.state === 'in'
}

function isCompleted(event: any) {
  return event?.status?.type?.completed === true
}

function parseEvents(data: any) {
  return (data?.events ?? []).map((event: any) => {
    const comp = event.competitions?.[0]
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
    return {
      id:        event.id,
      date:      event.date,
      name:      event.name,
      home:      home?.team?.displayName ?? '?',
      homeAbbr:  home?.team?.abbreviation ?? '?',
      homeLogo:  home?.team?.logo ?? '',
      homeScore: home?.score ?? '-',
      away:      away?.team?.displayName ?? '?',
      awayAbbr:  away?.team?.abbreviation ?? '?',
      awayLogo:  away?.team?.logo ?? '',
      awayScore: away?.score ?? '-',
      venue:     comp?.venue?.fullName ?? '',
      city:      comp?.venue?.address?.city ?? '',
      live:      isLive(event),
      completed: isCompleted(event),
      statusLabel: getStatusLabel(event),
      round:     event.season?.slug ?? '',
      note:      comp?.notes?.[0]?.headline ?? '',
    }
  })
}

// ── Flag emoji from country name (best-effort) ────────────────────────────────

const FLAG_MAP: Record<string, string> = {
  'United States': '🇺🇸', 'USA': '🇺🇸',
  'Mexico': '🇲🇽', 'Canada': '🇨🇦',
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷',
  'France': '🇫🇷', 'Germany': '🇩🇪',
  'Spain': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Portugal': '🇵🇹', 'Netherlands': '🇳🇱',
  'Italy': '🇮🇹', 'Belgium': '🇧🇪',
  'Uruguay': '🇺🇾', 'Colombia': '🇨🇴',
  'Japan': '🇯🇵', 'South Korea': '🇰🇷',
  'Australia': '🇦🇺', 'Senegal': '🇸🇳',
  'Morocco': '🇲🇦', 'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲', 'Nigeria': '🇳🇬',
  'Ecuador': '🇪🇨', 'Poland': '🇵🇱',
  'Croatia': '🇭🇷', 'Denmark': '🇩🇰',
  'Switzerland': '🇨🇭', 'Serbia': '🇷🇸',
  'Tunisia': '🇹🇳', 'Qatar': '🇶🇦',
  'Saudi Arabia': '🇸🇦', 'Iran': '🇮🇷',
  'South Africa': '🇿🇦',
}

function flag(name: string) {
  return FLAG_MAP[name] ?? '🏳'
}

// ── Scoreline pill ────────────────────────────────────────────────────────────

function ScorePill({ home, away, live, completed }: { home: string; away: string; live: boolean; completed: boolean }) {
  if (!live && !completed) return null
  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            6,
      padding:        '2px 8px',
      borderRadius:   99,
      fontSize:       13,
      fontWeight:     700,
      background:     live ? 'var(--wt-danger)' : 'var(--wt-surface-hover)',
      color:          live ? '#fff' : 'var(--wt-text)',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {home} – {away}
    </span>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ game, onClose }: { game: any; onClose: () => void }) {
  const [detail, setDetail]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchGameDetail(game.id)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [game.id])

  // Parse scorers from detail
  const scorers: { name: string; team: string; minute: string }[] = []
  if (detail) {
    const drives = detail?.drives?.previous ?? []
    // Try plays/goals from boxscore
    const scoring = detail?.scoringPlays ?? []
    for (const play of scoring) {
      scorers.push({
        name:   play?.participants?.[0]?.athlete?.displayName ?? play?.text ?? 'Goal',
        team:   play?.team?.displayName ?? '',
        minute: play?.clock?.displayValue ?? '',
      })
    }
  }

  const leaders = detail?.leaders ?? []
  const stats   = detail?.boxscore?.players ?? []

  return (
    <div style={{
      position:   'absolute',
      inset:      0,
      background: 'var(--wt-bg)',
      zIndex:     10,
      display:    'flex',
      flexDirection: 'column',
      borderRadius: 'inherit',
      overflow:   'hidden',
    }}>
      {/* Header */}
      <FlexRow align="center" justify="between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--wt-border)', flexShrink: 0 }}>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
        >
          <Icon icon="ArrowLeft" size={14} />
          <Text variant="label" color="muted" style={{ fontSize: 12 }}>Back</Text>
        </button>
        {game.live && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--wt-danger)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--wt-danger)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            LIVE
          </span>
        )}
        {game.completed && <Text variant="label" color="muted" style={{ fontSize: 11 }}>Full Time</Text>}
      </FlexRow>

      <ScrollArea style={{ flex: 1 }}>
        <FlexCol style={{ padding: '16px', gap: 16 }}>

          {/* Teams + Score */}
          <FlexCol align="center" style={{ gap: 8 }}>
            <FlexRow align="center" justify="center" style={{ gap: 20, width: '100%' }}>
              {/* Home */}
              <FlexCol align="center" style={{ flex: 1, gap: 6 }}>
                {game.homeLogo
                  ? <img src={game.homeLogo} alt={game.home} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                  : <Text style={{ fontSize: 28 }}>{flag(game.home)}</Text>
                }
                <Text variant="body" size="small" align="center" style={{ fontWeight: 600, lineHeight: 1.2 }}>{game.home}</Text>
              </FlexCol>

              {/* Score */}
              <FlexCol align="center" style={{ gap: 4 }}>
                {(game.live || game.completed)
                  ? <Text style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                      {game.homeScore} – {game.awayScore}
                    </Text>
                  : <Text variant="body" size="small" color="muted" style={{ fontWeight: 600 }}>{formatKickoff(game.date)}</Text>
                }
                {game.statusLabel && !game.completed && (
                  <Text variant="caption" color="muted" style={{ fontSize: 11 }}>{game.statusLabel}</Text>
                )}
              </FlexCol>

              {/* Away */}
              <FlexCol align="center" style={{ flex: 1, gap: 6 }}>
                {game.awayLogo
                  ? <img src={game.awayLogo} alt={game.away} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                  : <Text style={{ fontSize: 28 }}>{flag(game.away)}</Text>
                }
                <Text variant="body" size="small" align="center" style={{ fontWeight: 600, lineHeight: 1.2 }}>{game.away}</Text>
              </FlexCol>
            </FlexRow>

            {game.note && (
              <Text variant="caption" color="muted" style={{ fontSize: 11, textAlign: 'center' }}>{game.note}</Text>
            )}
            {game.venue && (
              <FlexRow align="center" style={{ gap: 4 }}>
                <Icon icon="MapPin" size={11} style={{ color: 'var(--wt-text-muted)' }} />
                <Text variant="caption" color="muted" style={{ fontSize: 11 }}>{game.venue}{game.city ? `, ${game.city}` : ''}</Text>
              </FlexRow>
            )}
          </FlexCol>

          <Box style={{ height: 1, background: 'var(--wt-border)' }} />

          {loading && (
            <Center style={{ padding: 24 }}>
              <Text variant="caption" color="muted" style={{ fontSize: 12 }}>Loading match details…</Text>
            </Center>
          )}

          {error && (
            <Center style={{ padding: 24 }}>
              <Text variant="caption" color="muted" style={{ fontSize: 12 }}>{error}</Text>
            </Center>
          )}

          {!loading && !error && (
            <>
              {/* Scorers */}
              {scorers.length > 0 && (
                <FlexCol style={{ gap: 8 }}>
                  <Text variant="label" color="muted" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Goals</Text>
                  {scorers.map((s, i) => (
                    <FlexRow key={i} align="center" style={{ gap: 8 }}>
                      <Icon icon="Football" size={12} style={{ color: 'var(--wt-text-muted)', flexShrink: 0 }} />
                      <Text variant="body" size="small" style={{ flex: 1 }}>{s.name}</Text>
                      {s.minute && <Text variant="caption" color="muted" style={{ fontSize: 11 }}>{s.minute}</Text>}
                    </FlexRow>
                  ))}
                </FlexCol>
              )}

              {/* Leaders */}
              {leaders.length > 0 && (
                <FlexCol style={{ gap: 8 }}>
                  <Text variant="label" color="muted" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Key Players</Text>
                  {leaders.slice(0, 3).map((l: any, i: number) => {
                    const leader = l?.leaders?.[0]
                    const athlete = leader?.athlete
                    if (!athlete) return null
                    return (
                      <FlexRow key={i} align="center" style={{ gap: 8 }}>
                        <Text variant="caption" color="muted" style={{ fontSize: 11, width: 80, flexShrink: 0 }}>{l.name}</Text>
                        <Text variant="body" size="small" style={{ flex: 1 }}>{athlete.displayName}</Text>
                        <Text variant="caption" color="muted" style={{ fontSize: 11 }}>{leader.displayValue}</Text>
                      </FlexRow>
                    )
                  })}
                </FlexCol>
              )}

              {/* No detail fallback */}
              {scorers.length === 0 && leaders.length === 0 && (
                <Center style={{ padding: 16 }}>
                  <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
                    {game.completed || game.live ? 'No detailed stats available yet' : 'Match details will appear at kickoff'}
                  </Text>
                </Center>
              )}
            </>
          )}
        </FlexCol>
      </ScrollArea>
    </div>
  )
}

// ── Game row ──────────────────────────────────────────────────────────────────

function GameRow({ game, onClick }: { game: any; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onPointerDown={e => e.stopPropagation()}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'flex',
        flexDirection:  'column',
        gap:            6,
        padding:        '10px 14px',
        borderRadius:   10,
        background:     hovered ? 'var(--wt-surface-hover)' : 'transparent',
        border:         'none',
        cursor:         'pointer',
        width:          '100%',
        textAlign:      'left',
        transition:     'background 0.1s',
      }}
    >
      {/* Top row: time/status + round note */}
      <FlexRow align="center" justify="between">
        <FlexRow align="center" style={{ gap: 6 }}>
          {game.live && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--wt-danger)', display: 'inline-block', flexShrink: 0 }} />
          )}
          <Text variant="label" style={{
            fontSize: 11,
            color: game.live ? 'var(--wt-danger)' : 'var(--wt-text-muted)',
            fontWeight: game.live ? 700 : 500,
          }}>
            {game.live ? `LIVE ${game.statusLabel}` : game.completed ? `FT` : formatKickoff(game.date)}
          </Text>
        </FlexRow>
        {game.note && (
          <Text variant="caption" color="muted" style={{ fontSize: 10 }}>{game.note}</Text>
        )}
        <Icon icon="CaretRight" size={12} style={{ color: 'var(--wt-text-muted)', opacity: hovered ? 0.8 : 0.3, flexShrink: 0 }} />
      </FlexRow>

      {/* Teams + score */}
      <FlexRow align="center" style={{ gap: 10 }}>
        {/* Home */}
        <FlexRow align="center" style={{ flex: 1, gap: 6, minWidth: 0 }}>
          {game.homeLogo
            ? <img src={game.homeLogo} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
            : <Text style={{ fontSize: 18, lineHeight: 1 }}>{flag(game.home)}</Text>
          }
          <Text variant="body" size="small" style={{
            fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            opacity: game.completed && parseInt(game.homeScore) < parseInt(game.awayScore) ? 0.45 : 1,
          }}>
            {game.home}
          </Text>
        </FlexRow>

        {/* Score or dash */}
        <FlexRow align="center" style={{ gap: 6, flexShrink: 0 }}>
          {(game.live || game.completed)
            ? <ScorePill home={game.homeScore} away={game.awayScore} live={game.live} completed={game.completed} />
            : <Text variant="caption" color="muted" style={{ fontSize: 12, fontWeight: 600 }}>vs</Text>
          }
        </FlexRow>

        {/* Away */}
        <FlexRow align="center" justify="end" style={{ flex: 1, gap: 6, minWidth: 0 }}>
          <Text variant="body" size="small" style={{
            fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            opacity: game.completed && parseInt(game.awayScore) < parseInt(game.homeScore) ? 0.45 : 1,
          }}>
            {game.away}
          </Text>
          {game.awayLogo
            ? <img src={game.awayLogo} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
            : <Text style={{ fontSize: 18, lineHeight: 1 }}>{flag(game.away)}</Text>
          }
        </FlexRow>
      </FlexRow>

      {/* Venue */}
      {game.venue && (
        <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
          📍 {game.venue}{game.city ? `, ${game.city}` : ''}
        </Text>
      )}
    </button>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function WorldcupWidget({ widgetId }: { widgetId: string }) {
  const [games, setGames]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [selectedGame, setSelected] = useState<any>(null)
  const [tab, setTab]               = useState<'upcoming' | 'live' | 'results'>('upcoming')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchGames()
      setGames(parseEvents(data))
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000) // refresh every 60s
    return () => clearInterval(interval)
  }, [load])

  const live     = games.filter(g => g.live)
  const upcoming = games.filter(g => !g.live && !g.completed)
  const results  = games.filter(g => g.completed)

  const activeTab = tab === 'live' ? live : tab === 'results' ? results : upcoming
  const liveCount = live.length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <FlexCol fullHeight style={{ color: 'var(--wt-text)' }}>

        {/* Header */}
        <FlexRow align="center" justify="between" style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <FlexRow align="center" style={{ gap: 8 }}>
            <Text style={{ fontSize: 20 }}>🏆</Text>
            <FlexCol style={{ gap: 1 }}>
              <Text variant="label" style={{ fontSize: 13, fontWeight: 700 }}>World Cup 2026</Text>
              {lastRefresh && (
                <Text variant="caption" color="muted" style={{ fontSize: 10 }}>
                  Updated {lastRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </Text>
              )}
            </FlexCol>
          </FlexRow>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={load}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)', padding: 4, display: 'flex' }}
            title="Refresh"
          >
            <Icon icon="ArrowsClockwise" size={14} style={{ opacity: loading ? 0.3 : 0.6 }} />
          </button>
        </FlexRow>

        {/* Tabs */}
        <FlexRow style={{ padding: '10px 12px 0', gap: 4, flexShrink: 0 }}>
          {(['upcoming', 'live', 'results'] as const).map(t => (
            <button
              key={t}
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setTab(t)}
              style={{
                padding:      '4px 12px',
                borderRadius: 99,
                fontSize:     11,
                fontWeight:   600,
                border:       'none',
                cursor:       'pointer',
                background:   tab === t
                  ? (t === 'live' ? 'var(--wt-danger)' : 'var(--wt-accent)')
                  : 'var(--wt-surface-hover)',
                color:        tab === t
                  ? (t === 'live' ? '#fff' : 'var(--wt-accent-text)')
                  : 'var(--wt-text-muted)',
                display:      'flex',
                alignItems:   'center',
                gap:          5,
              }}
            >
              {t === 'live' && liveCount > 0 && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: tab === 'live' ? '#fff' : 'var(--wt-danger)', display: 'inline-block' }} />
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'live' && liveCount > 0 && ` (${liveCount})`}
            </button>
          ))}
        </FlexRow>

        <Box style={{ height: 1, background: 'var(--wt-border)', margin: '10px 0 0', flexShrink: 0 }} />

        {/* Content */}
        {loading && games.length === 0 && (
          <Center fullHeight>
            <Text variant="caption" color="muted">Loading fixtures…</Text>
          </Center>
        )}

        {error && (
          <Center fullHeight>
            <FlexCol align="center" style={{ gap: 8 }}>
              <Text variant="caption" color="muted">{error}</Text>
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={load}
                style={{ fontSize: 11, color: 'var(--wt-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Try again
              </button>
            </FlexCol>
          </Center>
        )}

        {!loading && !error && activeTab.length === 0 && (
          <Center fullHeight>
            <FlexCol align="center" style={{ gap: 6 }}>
              <Text style={{ fontSize: 28 }}>
                {tab === 'live' ? '📺' : tab === 'results' ? '📋' : '📅'}
              </Text>
              <Text variant="caption" color="muted" style={{ fontSize: 12 }}>
                {tab === 'live' ? 'No live games right now' : tab === 'results' ? 'No results yet' : 'No upcoming fixtures found'}
              </Text>
              {tab === 'upcoming' && (
                <Text variant="caption" color="muted" style={{ fontSize: 11, textAlign: 'center', maxWidth: 220, opacity: 0.7 }}>
                  The 2026 World Cup kicks off June 11 in North America. Check back then!
                </Text>
              )}
            </FlexCol>
          </Center>
        )}

        {!error && activeTab.length > 0 && (
          <ScrollArea style={{ flex: 1 }}>
            <FlexCol style={{ padding: '6px 8px', gap: 2 }}>
              {activeTab.map(game => (
                <GameRow key={game.id} game={game} onClick={() => setSelected(game)} />
              ))}
            </FlexCol>
          </ScrollArea>
        )}
      </FlexCol>

      {/* Detail overlay */}
      {selectedGame && (
        <DetailPanel game={selectedGame} onClose={() => setSelected(null)} />
      )}

    </div>
  )
}
