import { Icon } from '@whiteboard/ui-kit'
import type { WidgetProps } from '@whiteboard/sdk'
import { useSpotifyStatus } from '../../src/hooks/useSpotify'
import { useSpotifyNowPlaying } from './hooks'

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ progressMs, durationMs }: { progressMs: number; durationMs: number }) {
  const pct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  return (
    <div className="w-full space-y-1">
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--wt-border)' }}>
        <div className="h-full rounded-full bg-green-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs tabular-nums" style={{ color: 'var(--wt-text-muted)' }}>
        <span>{fmt(progressMs)}</span>
        <span>{fmt(durationMs)}</span>
      </div>
    </div>
  )
}

// ── Not connected ──────────────────────────────────────────────────────────────

function NotConnected() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center select-none">
      <Icon icon="MusicNote" size={24} style={{ color: 'var(--wt-text-muted)' }} />
      <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
        Connect Spotify in <strong style={{ color: 'var(--wt-text)' }}>Settings</strong>
      </p>
    </div>
  )
}

// ── Nothing playing ────────────────────────────────────────────────────────────

function NotPlaying() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 select-none">
      <Icon icon="MusicNote" size={24} style={{ color: 'var(--wt-text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>Nothing playing</p>
    </div>
  )
}

// ── Now playing ────────────────────────────────────────────────────────────────

function NowPlaying({ track }: { track: NonNullable<ReturnType<typeof useSpotifyNowPlaying>['data']> }) {
  return (
    <div className="flex items-center gap-3 h-full px-4 select-none">
      {track.albumArt ? (
        <img src={track.albumArt} alt={track.album} className="w-16 h-16 rounded-md flex-shrink-0 object-cover" />
      ) : (
        <div className="w-16 h-16 rounded-md flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--wt-surface)' }}>
          <Icon icon="MusicNote" size={24} style={{ color: '#22c55e' }} />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div>
          <a href={track.externalUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm font-semibold leading-tight truncate block hover:underline"
            style={{ color: 'var(--wt-text)' }}>
            {track.title}
          </a>
          <p className="text-xs truncate" style={{ color: 'var(--wt-text-muted)' }}>{track.artist}</p>
        </div>
        <ProgressBar progressMs={track.progressMs} durationMs={track.durationMs} />
      </div>
    </div>
  )
}

// ── Widget ─────────────────────────────────────────────────────────────────────

export function SpotifyWidget({ widgetId: _widgetId }: WidgetProps) {
  const { data: status } = useSpotifyStatus()
  const { data: track }  = useSpotifyNowPlaying(status?.connected ?? false)

  if (!status?.connected) return <NotConnected />
  if (!track?.isPlaying)  return <NotPlaying />
  return <NowPlaying track={track} />
}
