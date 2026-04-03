import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'

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
  const [settings] = useWidgetSettings<SpotifyWidgetSettings>(widgetId, DEFAULT_SETTINGS)
  const [connected, setConnected]     = useState<boolean | null>(null)
  const [track,     setTrack]         = useState<NowPlaying | null>(null)
  const [progress,  setProgress]      = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check auth status on mount
  useEffect(() => {
    spotifyFetch('/status').then((d: any) => setConnected(!!d?.connected))
  }, [])

  // Poll now-playing every 5 s when connected
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

  // Local progress tick between polls
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
    // Optimistic UI
    if (action === 'play')  setTrack((t) => t ? { ...t, isPlaying: true  } : t)
    if (action === 'pause') setTrack((t) => t ? { ...t, isPlaying: false } : t)
    // Refresh after short delay to get actual new track
    setTimeout(async () => {
      const data = await spotifyFetch('/now-playing') as NowPlaying | null
      setTrack(data)
      setProgress(data?.progressMs ?? 0)
    }, 800)
  }

  // ── Not yet checked ──
  if (connected === null) {
    return <Centered><Spinner /></Centered>
  }

  // ── Not configured ──
  if (!settings.clientId || !settings.clientSecret) {
    return (
      <Centered>
        <SpotifyIcon size={36} />
        <p style={{ fontSize: 13, color: 'var(--wt-text-muted)', textAlign: 'center', margin: '8px 0 0', lineHeight: 1.5 }}>
          Open settings to connect<br />your Spotify account
        </p>
      </Centered>
    )
  }

  // ── Not authenticated ──
  if (!connected) {
    return (
      <Centered>
        <SpotifyIcon size={36} />
        <button
          onClick={async () => {
            const r = await fetch('/api/spotify/start-auth', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                clientId:    settings.clientId,
                clientSecret: settings.clientSecret,
                redirectUri:  settings.redirectUri,
              }),
            }).then((r) => r.json()) as any
            if (r.url) {
              window.open(r.url, '_blank', 'width=500,height=700')
              // Poll for connection after window opens
              const poll = setInterval(async () => {
                const s = await spotifyFetch('/status') as any
                if (s?.connected) { setConnected(true); clearInterval(poll) }
              }, 2000)
            }
          }}
          style={{
            marginTop: 12, padding: '8px 20px', borderRadius: 20,
            background: '#1DB954', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Connect Spotify
        </button>
      </Centered>
    )
  }

  // ── Nothing playing ──
  if (!track) {
    return (
      <Centered>
        <SpotifyIcon size={32} />
        <p style={{ fontSize: 12, color: 'var(--wt-text-muted)', marginTop: 8 }}>Nothing playing</p>
      </Centered>
    )
  }

  const pct = track.durationMs > 0 ? (progress / track.durationMs) * 100 : 0

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--wt-bg)',
      borderRadius: 'inherit',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Album art + blurred bg */}
      {track.albumArt && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${track.albumArt})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(24px) brightness(0.35)',
          transform: 'scale(1.1)',
        }} />
      )}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        flex: 1, padding: '16px 20px', gap: 10,
      }}>
        {/* Album art */}
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            style={{ width: 96, height: 96, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 96, height: 96, borderRadius: 8,
            background: 'var(--wt-surface)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <SpotifyIcon size={40} />
          </div>
        )}

        {/* Track info */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: '#fff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {track.title}
          </div>
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {track.artist}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%' }}>
          <div style={{
            width: '100%', height: 3, borderRadius: 2,
            background: 'rgba(255,255,255,0.2)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: '#1DB954',
              width: `${pct}%`,
              transition: 'width 1s linear',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{fmtTime(progress)}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{fmtTime(track.durationMs)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 2 }}>
          <CtrlBtn onClick={() => control('previous')} title="Previous">
            <PrevIcon />
          </CtrlBtn>
          <CtrlBtn onClick={() => control(track.isPlaying ? 'pause' : 'play')} large title={track.isPlaying ? 'Pause' : 'Play'}>
            {track.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </CtrlBtn>
          <CtrlBtn onClick={() => control('next')} title="Next">
            <NextIcon />
          </CtrlBtn>
        </div>
      </div>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function SpotifySettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<SpotifyWidgetSettings>(widgetId, DEFAULT_SETTINGS)
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    spotifyFetch('/status').then((d: any) => setConnected(!!d?.connected))
  }, [])

  const inp = (label: string, key: keyof SpotifyWidgetSettings, placeholder: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--wt-text-muted)', fontWeight: 500 }}>{label}</label>
      <input
        value={settings[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={placeholder}
        style={{
          padding: '6px 10px', fontSize: 12, borderRadius: 8,
          border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
          color: 'var(--wt-text)', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 11, color: 'var(--wt-text-muted)', margin: 0, lineHeight: 1.5 }}>
        Create an app at{' '}
        <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer"
          style={{ color: '#1DB954' }}>
          developer.spotify.com
        </a>
        {' '}and add <code style={{ fontSize: 10 }}>http://localhost:3001/api/spotify/callback</code> as a redirect URI.
      </p>

      {inp('Client ID', 'clientId', 'Your Spotify app client ID')}
      {inp('Client Secret', 'clientSecret', 'Your Spotify app client secret')}
      {inp('Redirect URI', 'redirectUri', 'http://localhost:3001/api/spotify/callback')}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <button
          onClick={async () => {
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
          }}
          disabled={!settings.clientId || !settings.clientSecret}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8,
            background: connected ? 'var(--wt-surface)' : '#1DB954',
            color: connected ? 'var(--wt-text)' : '#fff',
            border: connected ? '1px solid var(--wt-border)' : 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!settings.clientId || !settings.clientSecret) ? 0.5 : 1,
          }}
        >
          {connected ? 'Re-connect Spotify' : 'Connect Spotify'}
        </button>

        {connected && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: '#1DB954', fontWeight: 500,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1DB954' }} />
            Connected
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small UI pieces ───────────────────────────────────────────────────────────

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--wt-bg)', gap: 6,
    }}>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      border: '2px solid var(--wt-border)',
      borderTopColor: '#1DB954',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

function CtrlBtn({ onClick, children, large, title }: { onClick: () => void; children: React.ReactNode; large?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: large ? 44 : 32, height: large ? 44 : 32,
        borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: large ? '#1DB954' : 'rgba(255,255,255,0.15)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.1s, opacity 0.1s',
        flexShrink: 0,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onMouseUp={(e)   => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  )
}

function SpotifyIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 01-.277-1.215c3.809-.87 7.076-.496 9.712 1.115.293.18.387.563.207.857zm1.223-2.722a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.519-.972c3.632-1.102 8.147-.568 11.234 1.328a.78.78 0 01.257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 11-.543-1.793c3.563-1.08 9.488-.872 13.22 1.37a.937.937 0 01-.06 1.58z" />
    </svg>
  )
}

function PlayIcon() {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
}
function PauseIcon() {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
}
function PrevIcon() {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
}
function NextIcon() {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.35v8.7L8.5 12zM16 6h2v12h-2z"/></svg>
}
