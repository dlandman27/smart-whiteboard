import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import {
  Container, Center, FlexCol, FlexRow, Text,
  Input, SettingsSection, Button, Icon, IconButton, useWidgetSizeContext,
} from '@whiteboard/ui-kit'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpotifyWidgetSettings {
  clientId:     string
  clientSecret: string
  redirectUri:  string
}

const DEFAULT_SETTINGS: SpotifyWidgetSettings = {
  clientId:     '',
  clientSecret: '',
  redirectUri:  'http://localhost:3001/api/spotify/callback',
}

interface NowPlaying {
  isPlaying:   boolean
  title:       string
  artist:      string
  album:       string
  albumArt:    string | null
  progressMs:  number
  durationMs:  number
  externalUrl: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

async function spotifyFetch(path: string, method = 'GET', body?: object) {
  const res = await fetch(`/api/spotify${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (method !== 'GET') return res.ok
  if (res.status === 204) return null
  return res.ok ? res.json() : null
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function SpotifyWidget({ widgetId }: { widgetId: string }) {
  return (
    <Container style={{ background: 'var(--wt-bg)', borderRadius: 'inherit', overflow: 'hidden', position: 'relative' }}>
      <SpotifyContent widgetId={widgetId} />
    </Container>
  )
}

function SpotifyContent({ widgetId }: { widgetId: string }) {
  const { containerWidth: containerW, containerHeight: containerH } = useWidgetSizeContext()
  const [settings] = useWidgetSettings<SpotifyWidgetSettings>(widgetId, DEFAULT_SETTINGS)
  const [connected, setConnected]     = useState<boolean | null>(null)
  const [track,     setTrack]         = useState<NowPlaying | null>(null)
  const [progress,  setProgress]      = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    spotifyFetch('/status').then((d: any) => setConnected(!!d?.connected))
  }, [])

  useEffect(() => {
    if (!connected) return
    let active = true

    async function poll() {
      const data = await spotifyFetch('/now-playing') as NowPlaying | null
      if (!active) return
      setTrack(data)
      setProgress(data?.progressMs ?? 0)
    }

    poll()
    const id = setInterval(poll, 5000)
    return () => { active = false; clearInterval(id) }
  }, [connected])

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (track?.isPlaying) {
      tickRef.current = setInterval(() => {
        setProgress((p) => Math.min(p + 1000, track.durationMs))
      }, 1000)
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [track?.isPlaying, track?.durationMs])

  async function control(action: 'play' | 'pause' | 'next' | 'previous') {
    await spotifyFetch(`/${action}`, 'POST')
    if (action === 'play')  setTrack((t) => t ? { ...t, isPlaying: true  } : t)
    if (action === 'pause') setTrack((t) => t ? { ...t, isPlaying: false } : t)
    setTimeout(async () => {
      const data = await spotifyFetch('/now-playing') as NowPlaying | null
      setTrack(data)
      setProgress(data?.progressMs ?? 0)
    }, 800)
  }

  async function startAuth() {
    const r = await fetch('/api/spotify/start-auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        clientId:     settings.clientId,
        clientSecret: settings.clientSecret,
        redirectUri:  settings.redirectUri,
      }),
    }).then((r) => r.json()) as any
    if (r.url) {
      window.open(r.url, '_blank', 'width=500,height=700')
      const poll = setInterval(async () => {
        const s = await spotifyFetch('/status') as any
        if (s?.connected) { setConnected(true); clearInterval(poll) }
      }, 2000)
    }
  }

  // ── Not yet checked ──
  if (connected === null) return <Center fullHeight><Spinner /></Center>

  // ── Not configured ──
  if (!settings.clientId || !settings.clientSecret) {
    return (
      <Center fullHeight gap="sm">
        <SpotifyIcon size={48} />
        <Text variant="body" size="small" color="muted" align="center" style={{ fontSize: 16 }}>
          Open settings to connect{'\n'}your Spotify account
        </Text>
      </Center>
    )
  }

  // ── Not authenticated ──
  if (!connected) {
    return (
      <Center fullHeight gap="sm">
        <SpotifyIcon size={48} />
        <Button variant="accent" size="sm" onClick={startAuth} style={{ borderRadius: 20 }}>
          Connect Spotify
        </Button>
      </Center>
    )
  }

  // ── Nothing playing ──
  if (!track) {
    return (
      <Center fullHeight gap="sm">
        <SpotifyIcon size={48} />
        <Text variant="body" size="small" color="muted" style={{ fontSize: 16 }}>Nothing playing</Text>
      </Center>
    )
  }

  const pct    = track.durationMs > 0 ? (progress / track.durationMs) * 100 : 0
  const hasArt = !!track.albumArt

  // Scale album art to fill available space
  const artSize            = Math.max(72, Math.min(Math.round(containerW * 0.5), Math.round(containerH * 0.3), 180))
  const textColor          = hasArt ? 'rgba(255,255,255,0.95)' : 'var(--wt-text)'
  const textMutedColor     = hasArt ? 'rgba(255,255,255,0.7)'  : 'var(--wt-text-muted)'
  const timeColor          = hasArt ? 'rgba(255,255,255,0.5)'  : 'var(--wt-text-muted)'
  const progressTrackBg    = hasArt ? 'rgba(255,255,255,0.2)'  : 'var(--wt-surface-hover)'
  const ctrlSecondaryBg    = hasArt ? 'rgba(255,255,255,0.15)' : 'var(--wt-surface-hover)'
  const ctrlSecondaryColor = hasArt ? 'rgba(255,255,255,0.95)' : 'var(--wt-text)'

  return (
    <>
      {/* Blurred album art backdrop */}
      {track.albumArt && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${track.albumArt})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(24px) brightness(0.35)',
          transform: 'scale(1.1)',
        }} />
      )}

      <FlexCol align="center" justify="center" fullHeight gap="sm" className="relative z-[1] px-5 py-4">
        {/* Album art */}
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            style={{ width: artSize, height: artSize, borderRadius: 8, boxShadow: 'var(--wt-shadow-lg)', flexShrink: 0 }}
          />
        ) : (
          <Center style={{ width: artSize, height: artSize, borderRadius: 8, background: 'var(--wt-surface)' }}>
            <SpotifyIcon size={Math.round(artSize * 0.42)} />
          </Center>
        )}

        {/* Track info */}
        <FlexCol align="center" className="w-full">
          <Text
            variant="heading"
            size="small"
            align="center"
            numberOfLines={1}
            style={{ color: textColor, width: '100%', fontSize: 17 }}
          >
            {track.title}
          </Text>
          <Text
            variant="body"
            size="small"
            align="center"
            numberOfLines={1}
            style={{ color: textMutedColor, width: '100%', fontSize: 15 }}
          >
            {track.artist}
          </Text>
        </FlexCol>

        {/* Progress bar — 6px height */}
        <FlexCol className="w-full" gap="none">
          <div style={{
            width: '100%', height: 6, borderRadius: 3,
            background: progressTrackBg, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'var(--wt-accent)',
              width: `${pct}%`, transition: 'width 1s linear',
            }} />
          </div>
          <FlexRow justify="between" className="mt-1">
            <Text variant="caption" size="small" style={{ color: timeColor, fontSize: 13 }}>{fmtTime(progress)}</Text>
            <Text variant="caption" size="small" style={{ color: timeColor, fontSize: 13 }}>{fmtTime(track.durationMs)}</Text>
          </FlexRow>
        </FlexCol>

        {/* Playback controls — play 52px, skip 38px */}
        <FlexRow align="center" className="gap-5">
          <CtrlBtn onClick={() => control('previous')} title="Previous" bg={ctrlSecondaryBg} color={ctrlSecondaryColor}>
            <Icon icon="SkipBack" size={18} weight="fill" />
          </CtrlBtn>
          <CtrlBtn onClick={() => control(track.isPlaying ? 'pause' : 'play')} large title={track.isPlaying ? 'Pause' : 'Play'} bg="var(--wt-accent)" color="var(--wt-accent-text)">
            {track.isPlaying
              ? <Icon icon="Pause" size={22} weight="fill" />
              : <Icon icon="Play"  size={22} weight="fill" style={{ marginLeft: 2 }} />
            }
          </CtrlBtn>
          <CtrlBtn onClick={() => control('next')} title="Next" bg={ctrlSecondaryBg} color={ctrlSecondaryColor}>
            <Icon icon="SkipForward" size={18} weight="fill" />
          </CtrlBtn>
        </FlexRow>
      </FlexCol>
    </>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function SpotifySettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<SpotifyWidgetSettings>(widgetId, DEFAULT_SETTINGS)
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    spotifyFetch('/status').then((d: any) => setConnected(!!d?.connected))
  }, [])

  async function startAuth() {
    if (!settings.clientId || !settings.clientSecret) return
    const r = await fetch('/api/spotify/start-auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        clientId:     settings.clientId,
        clientSecret: settings.clientSecret,
        redirectUri:  settings.redirectUri || 'http://localhost:3001/api/spotify/callback',
      }),
    }).then((r) => r.json()) as any
    if (r.url) {
      window.open(r.url, '_blank', 'width=500,height=700')
      const poll = setInterval(async () => {
        const s = await spotifyFetch('/status') as any
        if (s?.connected) { setConnected(true); clearInterval(poll) }
      }, 2000)
    }
  }

  return (
    <SettingsSection label="Spotify Connection">
      <FlexCol gap="sm">
        <Text variant="body" size="small" color="muted">
          Create an app at{' '}
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--wt-accent)' }}>
            developer.spotify.com
          </a>
          {' '}and add{' '}
          <Text as="code" variant="caption" size="small">http://localhost:3001/api/spotify/callback</Text>
          {' '}as a redirect URI.
        </Text>

        <Input
          label="Client ID"
          value={settings.clientId}
          onChange={(e) => set({ clientId: e.target.value })}
          placeholder="Your Spotify app client ID"
          size="sm"
        />
        <Input
          label="Client Secret"
          value={settings.clientSecret}
          onChange={(e) => set({ clientSecret: e.target.value })}
          placeholder="Your Spotify app client secret"
          size="sm"
        />
        <Input
          label="Redirect URI"
          value={settings.redirectUri}
          onChange={(e) => set({ redirectUri: e.target.value })}
          placeholder="http://localhost:3001/api/spotify/callback"
          size="sm"
        />

        <FlexRow align="center" gap="sm">
          <Button
            variant={connected ? 'outline' : 'accent'}
            size="sm"
            fullWidth
            disabled={!settings.clientId || !settings.clientSecret}
            onClick={startAuth}
          >
            {connected ? 'Re-connect Spotify' : 'Connect Spotify'}
          </Button>
          {connected && (
            <FlexRow align="center" gap="xs" className="flex-shrink-0">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--wt-success)', flexShrink: 0 }} />
              <Text variant="caption" size="small" style={{ color: 'var(--wt-success)', fontWeight: 500 }}>Connected</Text>
            </FlexRow>
          )}
        </FlexRow>
      </FlexCol>
    </SettingsSection>
  )
}

// ── Small UI pieces ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '3px solid var(--wt-border)',
      borderTopColor: 'var(--wt-accent)',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

function CtrlBtn({
  onClick, children, large, title, bg, color,
}: {
  onClick:  () => void
  children: React.ReactNode
  large?:   boolean
  title?:   string
  bg:       string
  color:    string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-full border-none cursor-pointer flex-shrink-0 transition-transform active:scale-90"
      style={{
        width: large ? 52 : 38, height: large ? 52 : 38,
        background: bg, color,
      }}
    >
      {children}
    </button>
  )
}

function SpotifyIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--wt-accent)">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 01-.277-1.215c3.809-.87 7.076-.496 9.712 1.115.293.18.387.563.207.857zm1.223-2.722a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.519-.972c3.632-1.102 8.147-.568 11.234 1.328a.78.78 0 01.257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 11-.543-1.793c3.563-1.08 9.488-.872 13.22 1.37a.937.937 0 01-.06 1.58z" />
    </svg>
  )
}
